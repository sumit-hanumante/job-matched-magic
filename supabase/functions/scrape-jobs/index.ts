
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Job {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  apply_url: string;
  requirements?: string[];
  salary_range?: string;
  source: string;
  external_job_id?: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

async function scrapeFindeJobsApi(): Promise<Job[]> {
  console.log('Starting Finde.jobs API scraping...');
  try {
    const response = await fetchWithTimeout('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Finde.jobs API error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Failed to fetch jobs: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Finde.jobs raw response preview:', JSON.stringify(data).slice(0, 200));
    
    if (!data.data || !Array.isArray(data.data)) {
      console.error('Invalid API response format');
      return [];
    }
    
    // Clean and validate job data before returning
    const jobs = data.data
      .filter(job => job && job.title && job.company_name && job.url) // Only keep valid jobs
      .map((job: any) => ({
        title: String(job.title).slice(0, 255), // Ensure string and limit length
        company: String(job.company_name).slice(0, 255),
        location: String(job.location || 'Remote').slice(0, 255),
        description: String(job.description || ''),
        apply_url: String(job.url),
        source: 'findejobs',
        external_job_id: `fj_${job.slug}`,
        requirements: extractRequirements(job.description || ''),
        salary_range: extractSalaryRange(job.description || '')
      }));
    
    console.log(`Successfully parsed ${jobs.length} jobs from Finde.jobs`);
    return jobs;
    
  } catch (error) {
    console.error('Error in Finde.jobs scraping:', error);
    return [];
  }
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  
  if (!description) return requirements;
  
  // Common requirement indicators
  const requirementPatterns = [
    /requirements?:/i,
    /qualifications?:/i,
    /what you('ll)? need:/i,
    /what we('re)? looking for:/i,
    /must have:/i
  ];
  
  // Look for bullet points or numbered lists after requirement indicators
  requirementPatterns.forEach(pattern => {
    const match = description.match(new RegExp(`${pattern.source}([^]*?)(?=\\n\\n|$)`, 'i'));
    if (match) {
      const requirementSection = match[1];
      const bullets = requirementSection.match(/[•\-\*]\s*([^\n]+)/g) || 
                     requirementSection.match(/\d+\.\s*([^\n]+)/g);
      
      if (bullets) {
        bullets.forEach(bullet => {
          const cleaned = bullet.replace(/[•\-\*\d+\.]\s*/, '').trim();
          if (cleaned && !requirements.includes(cleaned)) {
            requirements.push(cleaned);
          }
        });
      }
    }
  });
  
  return requirements;
}

function extractSalaryRange(description: string): string | undefined {
  if (!description) return undefined;
  
  const salaryPatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k/i,
    /salary:\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[2]) {
        return `$${match[1]} - $${match[2]}${pattern.source.includes('k') ? 'K' : ''}`;
      } else {
        return `$${match[1]}`;
      }
    }
  }

  return undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job scraping process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Scrape jobs
    const jobs = await scrapeFindeJobsApi();
    console.log(`Found ${jobs.length} total jobs`);

    if (jobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No jobs found from any source'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Delete old jobs first
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .lt('posted_date', thirtyDaysAgo.toISOString());

    if (deleteError) {
      console.error('Error deleting old jobs:', deleteError);
      throw deleteError;
    }

    // Process jobs in smaller batches to avoid timeouts
    const batchSize = 20;
    const batches = [];
    for (let i = 0; i < jobs.length; i += batchSize) {
      batches.push(jobs.slice(i, i + batchSize));
    }

    let totalProcessed = 0;
    console.log(`Processing ${batches.length} batches of jobs...`);

    for (const batch of batches) {
      const { data: newJobs, error: insertError } = await supabase
        .from('jobs')
        .upsert(
          batch.map(job => ({
            ...job,
            posted_date: new Date().toISOString(),
            last_scraped_at: new Date().toISOString()
          }))
        );

      if (insertError) {
        console.error('Error upserting jobs batch:', insertError);
        continue;
      }

      if (newJobs) {
        totalProcessed += newJobs.length;
        console.log(`Processed batch of ${newJobs.length} jobs. Total: ${totalProcessed}`);
      }
    }

    console.log(`Successfully processed ${totalProcessed} jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${totalProcessed} jobs`,
        jobCounts: {
          total: totalProcessed
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in scrape-jobs function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

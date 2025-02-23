
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

async function scrapeRemoteOkJobs(): Promise<Job[]> {
  console.log('Starting RemoteOK jobs scraping...');
  try {
    // Use a different API endpoint that's more reliable
    const response = await fetch('https://remoteok.io/api?api=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('RemoteOK API error:', {
        status: response.status,
        statusText: response.statusText
      });
      throw new Error(`Failed to fetch RemoteOK jobs: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log('RemoteOK raw response preview:', text.slice(0, 200));
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse RemoteOK response:', error);
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.error('RemoteOK response is not an array:', typeof data);
      return [];
    }
    
    // Filter out any non-job objects and map to our job format
    const jobs = data
      .filter(item => item && typeof item === 'object' && 'position' in item)
      .map((job: any) => ({
        title: job.position || job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || 'Remote',
        description: job.description || '',
        apply_url: job.url || job.apply_url || '',
        source: 'remoteok',
        external_job_id: `rok_${job.id}`,
        requirements: extractRequirements(job.description || ''),
        salary_range: job.salary || extractSalaryRange(job.description || '')
      }));
    
    console.log(`Successfully parsed ${jobs.length} RemoteOK jobs`);
    return jobs;
    
  } catch (error) {
    console.error('Error in RemoteOK scraping:', error);
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
    
    // Scrape jobs from RemoteOK
    const remoteOkJobs = await scrapeRemoteOkJobs();
    console.log(`Found ${remoteOkJobs.length} RemoteOK jobs`);

    // Only proceed if we have jobs to process
    if (remoteOkJobs.length === 0) {
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

    // Insert new jobs
    const { data: newJobs, error: insertError } = await supabase
      .from('jobs')
      .upsert(
        remoteOkJobs.map(job => ({
          ...job,
          posted_date: new Date().toISOString(),
          last_scraped_at: new Date().toISOString()
        })),
        { 
          onConflict: 'external_job_id',
          ignoreDuplicates: true 
        }
      );

    if (insertError) {
      console.error('Error upserting jobs:', insertError);
      throw insertError;
    }

    console.log(`Successfully processed ${newJobs?.length || 0} jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${remoteOkJobs.length} jobs`,
        jobCounts: {
          remoteok: remoteOkJobs.length,
          total: remoteOkJobs.length
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

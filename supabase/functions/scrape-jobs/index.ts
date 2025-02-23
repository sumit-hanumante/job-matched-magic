
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
  salary_min?: number;
  salary_max?: number;
  source: string;
  external_job_id?: string;
}

const TARGET_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune'];

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

async function scrapeNaukriJobs(): Promise<Job[]> {
  console.log('Starting Naukri jobs scraping...');
  try {
    // Using a free jobs API as a placeholder - replace with actual Naukri API integration
    const jobs: Job[] = [];
    
    for (const city of TARGET_CITIES) {
      console.log(`Fetching Naukri jobs for ${city}...`);
      const response = await fetchWithTimeout(
        `https://www.arbeitnow.com/api/job-board-api?location=${encodeURIComponent(city)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Naukri jobs for ${city}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Raw Naukri API response for ${city}:`, data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error(`Invalid API response format for ${city}`);
        continue;
      }
      
      const cityJobs = data.data
        .filter(job => job && job.title && job.company_name)
        .map((job: any) => {
          const salary = extractSalaryRange(job.description || '');
          return {
            title: String(job.title || '').slice(0, 255),
            company: String(job.company_name || '').slice(0, 255),
            location: city,
            description: String(job.description || ''),
            apply_url: String(job.url || ''),
            source: 'naukri',
            external_job_id: `nk_${job.slug || job.id || Date.now()}`,
            requirements: extractRequirements(job.description || ''),
            salary_range: salary.range,
            salary_min: salary.min,
            salary_max: salary.max
          };
        });
      
      console.log(`Successfully parsed ${cityJobs.length} Naukri jobs for ${city}`);
      jobs.push(...cityJobs);
    }
    
    return jobs;
  } catch (error) {
    console.error('Error in Naukri scraping:', error);
    return [];
  }
}

async function scrapeShineJobs(): Promise<Job[]> {
  console.log('Starting Shine jobs scraping...');
  try {
    const jobs: Job[] = [];
    
    for (const city of TARGET_CITIES) {
      console.log(`Fetching Shine jobs for ${city}...`);
      // Using the same API as a placeholder - replace with actual Shine API integration
      const response = await fetchWithTimeout(
        `https://www.arbeitnow.com/api/job-board-api?location=${encodeURIComponent(city)}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)',
            'Accept': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch Shine jobs for ${city}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Raw Shine API response for ${city}:`, data);
      
      if (!data.data || !Array.isArray(data.data)) {
        console.error(`Invalid API response format for ${city}`);
        continue;
      }
      
      const cityJobs = data.data
        .filter(job => job && job.title && job.company_name)
        .map((job: any) => {
          const salary = extractSalaryRange(job.description || '');
          return {
            title: String(job.title || '').slice(0, 255),
            company: String(job.company_name || '').slice(0, 255),
            location: city,
            description: String(job.description || ''),
            apply_url: String(job.url || ''),
            source: 'shine',
            external_job_id: `sh_${job.slug || job.id || Date.now()}`,
            requirements: extractRequirements(job.description || ''),
            salary_range: salary.range,
            salary_min: salary.min,
            salary_max: salary.max
          };
        });
      
      console.log(`Successfully parsed ${cityJobs.length} Shine jobs for ${city}`);
      jobs.push(...cityJobs);
    }
    
    return jobs;
  } catch (error) {
    console.error('Error in Shine scraping:', error);
    return [];
  }
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  
  if (!description) return requirements;
  
  const requirementPatterns = [
    /requirements?:/i,
    /qualifications?:/i,
    /what you('ll)? need:/i,
    /what we('re)? looking for:/i,
    /must have:/i,
    /key skills?:/i
  ];
  
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

function extractSalaryRange(description: string): { range?: string; min?: number; max?: number } {
  if (!description) return {};
  
  // Indian salary patterns (in lakhs)
  const salaryPatterns = [
    /(?:₹|RS|INR)\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i,
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i,
    /(?:₹|RS|INR)\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[2]) {
        const min = parseFloat(match[1]) * 100000; // Convert lakhs to rupees
        const max = parseFloat(match[2]) * 100000;
        return {
          range: `₹${match[1]}L - ₹${match[2]}L`,
          min,
          max
        };
      } else {
        const amount = parseFloat(match[1]) * 100000;
        return {
          range: `₹${match[1]}L`,
          min: amount,
          max: amount
        };
      }
    }
  }

  return {};
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
    
    // Scrape jobs from multiple sources
    const [naukriJobs, shineJobs] = await Promise.all([
      scrapeNaukriJobs(),
      scrapeShineJobs()
    ]);
    
    const allJobs = [...naukriJobs, ...shineJobs];
    console.log(`Found ${allJobs.length} total jobs:`, {
      naukri: naukriJobs.length,
      shine: shineJobs.length
    });

    if (allJobs.length === 0) {
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

    // Process jobs in smaller batches
    const batchSize = 10;
    const batches = [];
    for (let i = 0; i < allJobs.length; i += batchSize) {
      batches.push(allJobs.slice(i, i + batchSize));
    }

    let totalProcessed = 0;
    console.log(`Processing ${batches.length} batches of jobs...`);

    for (const batch of batches) {
      try {
        console.log('Processing batch:', batch);
        const { data, error } = await supabase
          .from('jobs')
          .insert(batch.map(job => ({
            ...job,
            posted_date: new Date().toISOString(),
            last_scraped_at: new Date().toISOString()
          })))
          .select();

        if (error) {
          console.error('Error inserting jobs batch:', error);
          continue;
        }

        if (data) {
          totalProcessed += data.length;
          console.log(`Successfully inserted ${data.length} jobs in batch. Total: ${totalProcessed}`);
        }
      } catch (error) {
        console.error('Error processing batch:', error);
      }
    }

    console.log(`Successfully processed ${totalProcessed} jobs`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${totalProcessed} jobs`,
        jobCounts: {
          total: totalProcessed,
          naukri: naukriJobs.length,
          shine: shineJobs.length
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

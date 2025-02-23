
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Configuration for different job sources
const CONFIG = {
  remoteok: {
    enabled: true,
    baseUrl: 'https://remoteok.com/api',
  },
  arbeitnow: {
    enabled: true,
    baseUrl: 'https://www.arbeitnow.com/api/job-board-api',
  },
  adzuna: {
    enabled: true,
    baseUrl: 'https://api.adzuna.com/v1/api/jobs/gb/search/1',  // Changed to 'gb' as default region
  }
};

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

async function fetchRemoteOKJobs(): Promise<Job[]> {
  console.log('Fetching RemoteOK jobs...');
  try {
    const response = await fetch(CONFIG.remoteok.baseUrl);
    
    if (!response.ok) {
      throw new Error(`RemoteOK API error: ${response.status}`);
    }

    const jobs = await response.json();
    console.log(`RemoteOK jobs fetched:`, jobs.length);

    return jobs.slice(1).map((job: any) => ({
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description,
      apply_url: job.url,
      salary_range: job.salary,
      source: 'remoteok',
      external_job_id: `ro_${job.id}`,
      requirements: job.tags
    }));
  } catch (error) {
    console.error('RemoteOK fetching error:', error);
    return [];
  }
}

async function fetchArbeitnowJobs(): Promise<Job[]> {
  console.log('Fetching Arbeitnow jobs...');
  try {
    const response = await fetch(CONFIG.arbeitnow.baseUrl);
    
    if (!response.ok) {
      throw new Error(`Arbeitnow API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Arbeitnow jobs fetched:`, data.data?.length);

    return data.data.map((job: any) => ({
      title: job.title,
      company: job.company_name,
      location: job.location || 'Remote',
      description: job.description,
      apply_url: job.url,
      source: 'arbeitnow',
      external_job_id: `an_${job.slug}`,
      requirements: [], 
      salary_range: job.salary
    }));
  } catch (error) {
    console.error('Arbeitnow fetching error:', error);
    return [];
  }
}

async function fetchAdzunaJobs(): Promise<Job[]> {
  console.log('Fetching Adzuna jobs...');
  try {
    const appId = Deno.env.get('ADZUNA_APP_ID');
    const appKey = Deno.env.get('ADZUNA_APP_KEY');
    
    console.log('Checking Adzuna credentials...', { 
      hasAppId: !!appId, 
      hasAppKey: !!appKey 
    });

    if (!appId || !appKey) {
      console.warn('Adzuna API credentials not found');
      return [];
    }

    const url = new URL(CONFIG.adzuna.baseUrl);
    url.searchParams.append('app_id', appId);
    url.searchParams.append('app_key', appKey);
    url.searchParams.append('what', 'software developer');
    url.searchParams.append('results_per_page', '50');
    url.searchParams.append('content-type', 'application/json');

    console.log('Fetching from Adzuna URL:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Adzuna API error response:', errorText);
      return []; // Return empty array instead of throwing
    }

    const data = await response.json();
    console.log(`Adzuna jobs fetched:`, data.results?.length || 0);

    if (!data.results) {
      console.warn('No results found in Adzuna response');
      return [];
    }

    return data.results.map((job: any) => ({
      title: job.title || 'Unknown Title',
      company: job.company?.display_name || 'Unknown Company',
      location: job.location?.display_name || 'Unknown Location',
      description: job.description || '',
      apply_url: job.redirect_url,
      source: 'adzuna',
      external_job_id: `az_${job.id}`,
      requirements: [], 
      salary_range: job.salary_min && job.salary_max ? 
        `${job.salary_min} - ${job.salary_max}` : undefined,
      salary_min: job.salary_min,
      salary_max: job.salary_max
    }));
  } catch (error) {
    console.error('Adzuna fetching error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job fetching process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required environment variables');
    }
    
    console.log('Environment variables loaded successfully');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch jobs from all enabled sources
    const jobPromises = [];
    
    if (CONFIG.remoteok.enabled) {
      jobPromises.push(fetchRemoteOKJobs());
    }
    if (CONFIG.arbeitnow.enabled) {
      jobPromises.push(fetchArbeitnowJobs());
    }
    if (CONFIG.adzuna.enabled) {
      jobPromises.push(fetchAdzunaJobs());
    }

    const jobArrays = await Promise.allSettled(jobPromises);
    console.log('Job fetching results:', jobArrays);

    // Filter out rejected promises and flatten the array
    const allJobs = jobArrays
      .filter((result): result is PromiseFulfilledResult<Job[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);

    console.log(`Total jobs fetched: ${allJobs.length}`);

    if (allJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No jobs found from any source'
        }),
        { 
          status: 200,  // Changed from 404 to 200 to prevent error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert all jobs into database with current timestamp
    const { data, error } = await supabase
      .from('jobs')
      .insert(allJobs.map(job => ({
        ...job,
        posted_date: new Date().toISOString(),
        last_scraped_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

    // Return detailed response for monitoring
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${allJobs.length} jobs`,
        stats: {
          total: allJobs.length,
          bySource: {
            remoteok: allJobs.filter(j => j.source === 'remoteok').length,
            arbeitnow: allJobs.filter(j => j.source === 'arbeitnow').length,
            adzuna: allJobs.filter(j => j.source === 'adzuna').length
          }
        },
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error in job fetching:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,  // Changed from 500 to 200 to prevent client error
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

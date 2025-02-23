
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
  greenhouse: {
    enabled: true,
    baseUrl: 'https://boards-api.greenhouse.io/v1/boards/example/jobs', // Replace 'example' with actual board token
  },
  wellfound: {
    enabled: true,
    baseUrl: 'https://api.wellfound.com/api/v1/listings/jobs',
  },
  linkedin: {
    enabled: false, // Disabled as requested
    baseUrl: '',
  },
  naukri: {
    enabled: false, // Disabled as requested
    baseUrl: '',
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

    // Skip the first item as it's typically metadata
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

async function fetchGreenhouseJobs(): Promise<Job[]> {
  console.log('Fetching Greenhouse jobs...');
  try {
    const response = await fetch(CONFIG.greenhouse.baseUrl);
    
    if (!response.ok) {
      throw new Error(`Greenhouse API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Greenhouse jobs fetched:`, data.jobs?.length);

    return data.jobs.map((job: any) => ({
      title: job.title,
      company: job.company_name || 'Via Greenhouse',
      location: job.location?.name || 'Various',
      description: job.content,
      apply_url: job.absolute_url,
      source: 'greenhouse',
      external_job_id: `gh_${job.id}`,
      requirements: job.metadata?.requirements || []
    }));
  } catch (error) {
    console.error('Greenhouse fetching error:', error);
    return [];
  }
}

async function fetchWellfoundJobs(): Promise<Job[]> {
  console.log('Fetching Wellfound jobs...');
  try {
    // Note: Wellfound API might require authentication
    const response = await fetch(CONFIG.wellfound.baseUrl, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('WELLFOUND_API_KEY')}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`Wellfound API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Wellfound jobs fetched:`, data.jobs?.length);

    return data.jobs.map((job: any) => ({
      title: job.title,
      company: job.company.name,
      location: job.location,
      description: job.description,
      apply_url: job.application_url,
      salary_range: `${job.min_salary || ''} - ${job.max_salary || ''}`,
      source: 'wellfound',
      external_job_id: `wf_${job.id}`,
      requirements: job.skills || []
    }));
  } catch (error) {
    console.error('Wellfound fetching error:', error);
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
    if (CONFIG.greenhouse.enabled) {
      jobPromises.push(fetchGreenhouseJobs());
    }
    if (CONFIG.wellfound.enabled) {
      jobPromises.push(fetchWellfoundJobs());
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
          status: 404,
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
            greenhouse: allJobs.filter(j => j.source === 'greenhouse').length,
            wellfound: allJobs.filter(j => j.source === 'wellfound').length
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
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

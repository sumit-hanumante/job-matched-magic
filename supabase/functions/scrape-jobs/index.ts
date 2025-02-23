
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    baseUrl: 'https://api.adzuna.com/v1/api/jobs/in/search/1',
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
    console.log(`RemoteOK jobs fetched: ${jobs.length - 1}`); // -1 because first item is metadata

    return jobs.slice(1).map((job: any) => ({
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description,
      apply_url: job.url,
      salary_range: job.salary,
      source: 'remoteok',
      external_job_id: `ro_${job.id}`,
      requirements: job.tags,
      posted_date: new Date().toISOString()
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
    console.log(`Arbeitnow jobs fetched: ${data.data?.length}`);

    return data.data.map((job: any) => ({
      title: job.title,
      company: job.company_name,
      location: job.location || 'Remote',
      description: job.description,
      apply_url: job.url,
      source: 'arbeitnow',
      external_job_id: `an_${job.slug}`,
      requirements: [], 
      salary_range: job.salary,
      posted_date: new Date().toISOString()
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
    
    if (!appId || !appKey) {
      throw new Error('Adzuna API credentials missing');
    }

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: '50',
      what: 'software developer',
      where: 'india',
      category: 'it-jobs',
      country: 'in',
      content_type: 'application/json'
    });

    const url = `${CONFIG.adzuna.baseUrl}?${params.toString()}`;
    console.log('Fetching from Adzuna URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Adzuna jobs fetched: ${data.results?.length}`);

    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('No results found in Adzuna response');
    }

    return data.results.map((job: any) => ({
      title: job.title?.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Unknown Title',
      company: job.company?.display_name || 'Unknown Company',
      location: job.location?.area?.join(', ') || job.location?.display_name || 'India',
      description: job.description || '',
      apply_url: job.redirect_url,
      source: 'adzuna',
      external_job_id: `az_${job.id}`,
      requirements: [],
      salary_range: job.salary_min || job.salary_max ? 
        `₹${job.salary_min?.toLocaleString() || '0'} - ₹${job.salary_max?.toLocaleString() || '0'}` : 
        undefined,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      posted_date: new Date(job.created).toISOString()
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
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch jobs from all enabled sources
    const jobPromises = [
      CONFIG.remoteok.enabled ? fetchRemoteOKJobs() : Promise.resolve([]),
      CONFIG.arbeitnow.enabled ? fetchArbeitnowJobs() : Promise.resolve([]),
      CONFIG.adzuna.enabled ? fetchAdzunaJobs() : Promise.resolve([]),
    ];

    const jobArrays = await Promise.all(jobPromises);
    const allJobs = jobArrays.flat();

    console.log(`Total jobs fetched: ${allJobs.length}`);

    if (allJobs.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No jobs found from any source'
        }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert jobs with upsert to avoid duplicates
    const { data, error } = await supabase
      .from('jobs')
      .upsert(
        allJobs.map(job => ({
          ...job,
          last_scraped_at: new Date().toISOString()
        })),
        { 
          onConflict: 'external_job_id,source',
          ignoreDuplicates: true 
        }
      );

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

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
        }
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
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

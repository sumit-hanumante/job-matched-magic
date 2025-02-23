import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AdzunaResponse {
  results: Array<{
    id: string;
    title: string;
    description: string;
    created: string;
    company: { display_name: string };
    location: { display_name: string; area: string[] };
    redirect_url: string;
    salary_min: number;
    salary_max: number;
  }>;
  count: number;
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
  external_job_id: string;
  posted_date: string;
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
  console.log('Starting Adzuna job fetch...');
  
  const appId = Deno.env.get('ADZUNA_APP_ID');
  const appKey = Deno.env.get('ADZUNA_APP_KEY');
  
  if (!appId || !appKey) {
    console.error('Adzuna credentials missing');
    return [];
  }

  try {
    const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
    
    // Add required parameters
    url.searchParams.append('app_id', appId);
    url.searchParams.append('app_key', appKey);
    url.searchParams.append('results_per_page', '50');
    url.searchParams.append('content-type', 'application/json');
    
    // Add search filters
    url.searchParams.append('what', 'software developer');
    url.searchParams.append('where', 'india');
    url.searchParams.append('category', 'it-jobs');

    console.log('Fetching from Adzuna URL:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`Adzuna API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return [];
    }

    const data: AdzunaResponse = await response.json();
    console.log(`Received ${data.results?.length} jobs from Adzuna`);

    if (!data.results?.length) {
      console.log('No results found in Adzuna response');
      return [];
    }

    return data.results.map(job => ({
      title: job.title.replace(/<\/?[^>]+(>|$)/g, "").trim(),
      company: job.company.display_name || 'Unknown Company',
      location: job.location.display_name || job.location.area?.join(', ') || 'India',
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
    console.error('Error in Adzuna fetch:', error);
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
    
    // Test Adzuna fetch first
    console.log('Testing Adzuna fetch...');
    const adzunaJobs = await fetchAdzunaJobs();
    console.log(`Fetched ${adzunaJobs.length} Adzuna jobs`);

    // If we got Adzuna jobs, proceed with other sources
    const remoteOkJobs = await fetchRemoteOKJobs();
    const arbeitnowJobs = await fetchArbeitnowJobs();
    
    const allJobs = [...adzunaJobs, ...remoteOkJobs, ...arbeitnowJobs];
    console.log(`Total jobs fetched: ${allJobs.length}`);

    if (allJobs.length === 0) {
      console.log('No jobs found from any source');
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

    // Insert jobs with upsert
    console.log('Upserting jobs to database...');
    const { error: upsertError } = await supabase
      .from('jobs')
      .upsert(
        allJobs.map(job => ({
          ...job,
          last_scraped_at: new Date().toISOString()
        })),
        { 
          onConflict: 'external_job_id,source',
          ignoreDuplicates: false
        }
      );

    if (upsertError) {
      console.error('Database insertion error:', upsertError);
      throw upsertError;
    }

    console.log('Jobs successfully updated in database');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${allJobs.length} jobs`,
        stats: {
          total: allJobs.length,
          bySource: {
            adzuna: adzunaJobs.length,
            remoteok: remoteOkJobs.length,
            arbeitnow: arbeitnowJobs.length
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

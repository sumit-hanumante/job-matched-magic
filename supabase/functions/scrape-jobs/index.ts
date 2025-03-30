
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Job {
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

async function fetchAdzunaJobsApproach1(jobType: string): Promise<{ jobs: Job[]; error?: string }> {
  try {
    const appId = Deno.env.get('ADZUNA_APP_ID');
    const appKey = Deno.env.get('ADZUNA_APP_KEY');
    
    if (!appId || !appKey) {
      console.error('Approach 1 - Missing credentials');
      return { jobs: [], error: 'Adzuna credentials missing' };
    }

    console.log('Approach 1 - Using credentials:', { appId: appId.slice(0,4) + '...', appKey: appKey.slice(0,4) + '...' });

    const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
    url.searchParams.append('app_id', appId);
    url.searchParams.append('app_key', appKey);
    url.searchParams.append('results_per_page', '100');
    url.searchParams.append('what', jobType);
    url.searchParams.append('content-type', 'application/json');

    console.log('Approach 1 - Full URL:', url.toString());
    
    const response = await fetch(url.toString());
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Approach 1 - Error response:', responseText);
      throw new Error(`Adzuna API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Approach 1 - Successful response with', data.results?.length || 0, 'jobs');

    return {
      jobs: (data.results || []).map((job: any) => ({
        title: job.title?.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Unknown Title',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || 'India',
        description: job.description || '',
        apply_url: job.redirect_url,
        source: 'adzuna',
        external_job_id: `az1_${job.id}`,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_range: job.salary_min ? `₹${job.salary_min.toLocaleString()}` : undefined,
        posted_date: new Date(job.created || Date.now()).toISOString()
      }))
    };
  } catch (error) {
    console.error('Approach 1 detailed error:', error);
    return { jobs: [], error: error.message };
  }
}

async function fetchAdzunaJobsApproach2(jobType: string): Promise<{ jobs: Job[]; error?: string }> {
  try {
    const appId = Deno.env.get('ADZUNA_APP_ID');
    const appKey = Deno.env.get('ADZUNA_APP_KEY');
    
    if (!appId || !appKey) {
      return { jobs: [], error: 'Adzuna credentials missing' };
    }

    const baseUrl = 'https://api.adzuna.com/v1/api/jobs/in/search/1';
    const url = `${baseUrl}?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${jobType}&content-type=application/json`;
    
    console.log('Approach 2 - Fetching jobs...');
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Approach 2 - Results:', data.results?.length || 0);

    return {
      jobs: (data.results || []).map((job: any) => ({
        title: job.title?.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Unknown Title',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || 'India',
        description: job.description || '',
        apply_url: job.redirect_url,
        source: 'adzuna',
        external_job_id: `az2_${job.id}`,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_range: job.salary_min ? `₹${job.salary_min.toLocaleString()}` : undefined,
        posted_date: new Date(job.created || Date.now()).toISOString()
      }))
    };
  } catch (error) {
    console.error('Approach 2 error:', error);
    return { jobs: [], error: error.message };
  }
}

async function fetchAdzunaJobsApproach3(jobType: string): Promise<{ jobs: Job[]; error?: string }> {
  try {
    const appId = Deno.env.get('ADZUNA_APP_ID');
    const appKey = Deno.env.get('ADZUNA_APP_KEY');
    
    if (!appId || !appKey) {
      return { jobs: [], error: 'Adzuna credentials missing' };
    }

    const url = new URL('https://api.adzuna.com/v1/api/jobs/in/search/1');
    const params = {
      app_id: appId,
      app_key: appKey,
      results_per_page: '20',
      what: jobType,
      where: 'india',
      content_type: 'application/json',
      category: 'it-jobs'
    };

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log('Approach 3 - Fetching from:', url.toString());
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Approach 3 - Results:', data.results?.length || 0);

    return {
      jobs: (data.results || []).map((job: any) => ({
        title: job.title?.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Unknown Title',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.display_name || 'India',
        description: job.description || '',
        apply_url: job.redirect_url,
        source: 'adzuna',
        external_job_id: `az3_${job.id}`,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        salary_range: job.salary_min ? `₹${job.salary_min.toLocaleString()}` : undefined,
        posted_date: new Date(job.created || Date.now()).toISOString()
      }))
    };
  } catch (error) {
    console.error('Approach 3 error:', error);
    return { jobs: [], error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job fetching process with detailed logging...');
    
    const { jobType = "software developer" } = await req.json();
    console.log('Fetching jobs for type:', jobType);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    // Fixed: import createClient correctly
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try all approaches in parallel
    console.log('Attempting all approaches for job type:', jobType);
    const [approach1Result, approach2Result, approach3Result] = await Promise.all([
      fetchAdzunaJobsApproach1(jobType).catch(error => ({ jobs: [], error: error.message })),
      fetchAdzunaJobsApproach2(jobType).catch(error => ({ jobs: [], error: error.message })),
      fetchAdzunaJobsApproach3(jobType).catch(error => ({ jobs: [], error: error.message }))
    ]);

    console.log('Results from approaches:', {
      approach1: {
        jobCount: approach1Result.jobs.length,
        hasError: !!approach1Result.error
      },
      approach2: {
        jobCount: approach2Result.jobs.length,
        hasError: !!approach2Result.error
      },
      approach3: {
        jobCount: approach3Result.jobs.length,
        hasError: !!approach3Result.error
      }
    });

    // Combine successful results
    const allJobs = [
      ...approach1Result.jobs,
      ...approach2Result.jobs,
      ...approach3Result.jobs
    ];

    console.log(`Total jobs fetched: ${allJobs.length}`);

    if (allJobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No jobs found from any approach',
          errors: {
            approach1: approach1Result.error,
            approach2: approach2Result.error,
            approach3: approach3Result.error
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert jobs with upsert
    const { error: upsertError } = await supabase
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

    if (upsertError) {
      throw upsertError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed ${allJobs.length} jobs`,
        stats: {
          approach1: {
            jobs: approach1Result.jobs.length,
            error: approach1Result.error
          },
          approach2: {
            jobs: approach2Result.jobs.length,
            error: approach2Result.error
          },
          approach3: {
            jobs: approach3Result.jobs.length,
            error: approach3Result.error
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

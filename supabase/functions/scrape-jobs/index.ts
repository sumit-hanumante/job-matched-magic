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
    baseUrl: 'https://api.adzuna.com/v1/api/jobs/in/search/1',  // Changed to 'in' for India
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

async function testAdzunaIntegration() {
  console.log('Running Adzuna integration test...');
  
  const appId = Deno.env.get('ADZUNA_APP_ID');
  const appKey = Deno.env.get('ADZUNA_APP_KEY');
  
  console.log('API Credentials:', {
    hasAppId: !!appId,
    appIdLength: appId?.length,
    hasAppKey: !!appKey,
    appKeyLength: appKey?.length
  });

  // Test URL construction
  const params = new URLSearchParams({
    app_id: appId || '',
    app_key: appKey || '',
    results_per_page: '1', // Just get 1 result for testing
    what: 'software developer',
    where: 'india',
    category: 'it-jobs',
    country: 'in',
    content_type: 'application/json'
  });

  const testUrl = `${CONFIG.adzuna.baseUrl}?${params.toString()}`;
  console.log('Test URL:', testUrl);

  try {
    // Make test request
    const response = await fetch(testUrl);
    const responseText = await response.text();
    
    console.log('Adzuna Test Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText.slice(0, 500) + '...' // Log first 500 chars
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed Response:', {
        count: data.count,
        hasResults: !!data.results,
        resultsLength: data.results?.length,
        sample: data.results?.[0]
      });
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e.message}`);
    }

    return {
      success: true,
      message: 'Integration test successful',
      data: data
    };
  } catch (error) {
    console.error('Integration test failed:', error);
    return {
      success: false,
      message: error.message,
      error: error
    };
  }
}

async function fetchAdzunaJobs(): Promise<Job[]> {
  console.log('Fetching Adzuna jobs for India...');
  
  // Run integration test first
  const testResult = await testAdzunaIntegration();
  console.log('Integration test result:', testResult);
  
  if (!testResult.success) {
    console.error('Skipping Adzuna job fetch due to failed integration test');
    return [];
  }

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
    const response = await fetch(url);
    const responseText = await response.text();
    
    if (!response.ok) {
      throw new Error(`Adzuna API error: ${response.status} ${response.statusText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error(`Failed to parse Adzuna response: ${e.message}`);
    }

    console.log('Adzuna API Response:', {
      count: data.count,
      resultsCount: data.results?.length,
      firstJob: data.results?.[0]
    });

    if (!data.results || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error('No results found in Adzuna response');
    }

    const jobs = data.results.map((job: any) => {
      const jobData = {
        title: job.title?.replace(/<\/?[^>]+(>|$)/g, "").trim() || 'Unknown Title',
        company: job.company?.display_name || 'Unknown Company',
        location: job.location?.area?.join(', ') || job.location?.display_name || 'India',
        description: job.description || '',
        apply_url: job.redirect_url,
        source: 'adzuna',
        external_job_id: `az_${job.id}`,
        requirements: [], 
        salary_range: undefined as string | undefined,
        salary_min: undefined as number | undefined,
        salary_max: undefined as number | undefined
      };

      if (job.salary_min || job.salary_max) {
        const min = Math.round(job.salary_min);
        const max = Math.round(job.salary_max);
        jobData.salary_min = min || undefined;
        jobData.salary_max = max || undefined;
        if (min && max) {
          jobData.salary_range = `₹${min.toLocaleString()} - ₹${max.toLocaleString()}`;
        } else if (min) {
          jobData.salary_range = `From ₹${min.toLocaleString()}`;
        } else if (max) {
          jobData.salary_range = `Up to ₹${max.toLocaleString()}`;
        }
      }

      return jobData;
    });

    console.log(`Successfully processed ${jobs.length} Adzuna jobs`);
    return jobs;
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

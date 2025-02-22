import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  apply_url: string;
  requirements?: string[];
  salary_range?: string;
  source: string;
  external_job_id: string;
  applicant_count?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job scraping process...');

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allJobs: Job[] = [];

    // LinkedIn Jobs API
    try {
      const scrapingAntKey = Deno.env.get('SCRAPINGANT_API_KEY');
      if (scrapingAntKey) {
        const locations = ['Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
        const keywords = ['Software Engineer', 'Developer', 'Data Scientist', 'DevOps', 'Frontend', 'Backend'];
        
        for (const location of locations) {
          for (const keyword of keywords) {
            const url = `https://api.scrapingant.com/v2/linkedin?url=${encodeURIComponent(
              `https://linkedin.com/jobs/search?keywords=${keyword}&location=${location}&num_results=100`
            )}&x-api-key=${scrapingAntKey}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.jobs) {
              const linkedinJobs = data.jobs
                .filter((job: any) => job.applicantCount < 300)
                .map((job: any) => ({
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  description: job.description,
                  apply_url: job.applyUrl,
                  requirements: job.requirements,
                  salary_range: job.salaryRange,
                  source: 'linkedin',
                  external_job_id: job.jobId,
                  applicant_count: job.applicantCount,
                }));
              allJobs.push(...linkedinJobs);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error);
    }

    // Indeed Jobs API
    try {
      const apidevKey = Deno.env.get('APIDEV_API_KEY');
      if (apidevKey) {
        const cities = ['mumbai', 'bangalore', 'delhi', 'pune', 'hyderabad', 'chennai'];
        const queries = ['software', 'developer', 'engineer', 'data scientist', 'devops'];

        for (const city of cities) {
          for (const query of queries) {
            const url = `https://api.apidev.co/indeed?q=${encodeURIComponent(query)}&l=${city}&apikey=${apidevKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.jobs) {
              const indeedJobs = data.jobs.map((job: any) => ({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                apply_url: job.url,
                salary_range: job.salary,
                source: 'indeed',
                external_job_id: job.jobId,
              }));
              allJobs.push(...indeedJobs);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Indeed jobs:', error);
    }

    // Google Jobs API (SerpApi)
    try {
      const serpApiKey = Deno.env.get('SERPAPI_API_KEY');
      if (serpApiKey) {
        const queries = ['Software Engineer India', 'Developer India', 'Data Scientist India', 'DevOps Engineer India'];
        
        for (const query of queries) {
          const url = `https://serpapi.com/search?engine=google_jobs&q=${encodeURIComponent(query)}&gl=in&api_key=${serpApiKey}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.jobs_results) {
            const googleJobs = data.jobs_results.map((job: any) => ({
              title: job.title,
              company: job.company_name,
              location: job.location,
              description: job.description,
              apply_url: job.job_link,
              requirements: job.requirements,
              source: 'google_jobs',
              external_job_id: job.job_id,
            }));
            allJobs.push(...googleJobs);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Google jobs:', error);
    }

    console.log(`Total jobs collected: ${allJobs.length}`);

    if (allJobs.length > 0) {
      // First, delete old jobs that were scraped (keep manually added jobs)
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .neq('source', 'manual');

      if (deleteError) {
        throw deleteError;
      }

      // Insert new jobs
      const { error: insertError } = await supabase
        .from('jobs')
        .insert(allJobs);

      if (insertError) {
        throw insertError;
      }

      console.log('Jobs updated successfully');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully processed ${allJobs.length} jobs` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in job scraping process:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

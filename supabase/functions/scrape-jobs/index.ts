
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const allJobs: Job[] = [];

    // LinkedIn Jobs API (Paid)
    try {
      const scrapingAntKey = Deno.env.get('SCRAPINGANT_API_KEY');
      if (scrapingAntKey) {
        const locations = ['Remote', 'Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad', 'Chennai'];
        const keywords = ['Software Engineer', 'Developer', 'Data Scientist', 'DevOps', 'Frontend', 'Backend'];
        
        for (const location of locations) {
          for (const keyword of keywords) {
            console.log(`Fetching LinkedIn jobs for ${keyword} in ${location}`);
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
                  apply_url: job.applyUrl || `https://linkedin.com/jobs/view/${job.jobId}`,
                  requirements: job.requirements,
                  salary_range: job.salaryRange,
                  source: 'linkedin',
                  external_job_id: job.jobId,
                  applicant_count: job.applicantCount,
                }));
              allJobs.push(...linkedinJobs);
              console.log(`Added ${linkedinJobs.length} LinkedIn jobs from ${location} for ${keyword}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching LinkedIn jobs:', error);
    }

    // GitHub Jobs API (Free)
    try {
      console.log('Fetching GitHub jobs...');
      const response = await fetch('https://dev.to/api/listings/search?category=job');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const githubJobs = data.map((job: any) => ({
          title: job.title,
          company: job.organization || job.company_name || 'Company Not Specified',
          location: job.location || 'Remote',
          description: job.description || job.listing_details || '',
          apply_url: job.url || job.link || `https://dev.to/listings/${job.id}`,
          requirements: [],
          source: 'github',
          external_job_id: `gh_${job.id}`,
        }));
        allJobs.push(...githubJobs);
        console.log(`Added ${githubJobs.length} GitHub jobs`);
      }
    } catch (error) {
      console.error('Error fetching GitHub jobs:', error);
    }

    // Indeed Jobs API (Paid)
    try {
      const apidevKey = Deno.env.get('APIDEV_API_KEY');
      if (apidevKey) {
        const cities = ['remote', 'mumbai', 'bangalore', 'delhi', 'pune', 'hyderabad', 'chennai'];
        const queries = ['software', 'developer', 'engineer', 'data scientist', 'devops'];

        for (const city of cities) {
          for (const query of queries) {
            console.log(`Fetching Indeed jobs for ${query} in ${city}`);
            const url = `https://api.apidev.co/indeed?q=${encodeURIComponent(query)}&l=${city}&apikey=${apidevKey}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.jobs) {
              const indeedJobs = data.jobs.map((job: any) => ({
                title: job.title,
                company: job.company,
                location: job.location,
                description: job.description,
                apply_url: job.url || `https://indeed.com/viewjob?jk=${job.jobId}`,
                salary_range: job.salary,
                source: 'indeed',
                external_job_id: job.jobId,
              }));
              allJobs.push(...indeedJobs);
              console.log(`Added ${indeedJobs.length} Indeed jobs from ${city} for ${query}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Indeed jobs:', error);
    }

    // RemoteOK API (Free)
    try {
      console.log('Fetching RemoteOK jobs...');
      const response = await fetch('https://remoteok.io/api', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const remoteJobs = data
          .filter((job: any) => job.position && job.company) // Filter out non-job objects
          .map((job: any) => ({
            title: job.position,
            company: job.company,
            location: 'Remote',
            description: job.description || '',
            apply_url: job.url || `https://remoteok.io/l/${job.id}`,
            salary_range: job.salary,
            requirements: [],
            source: 'remoteok',
            external_job_id: `rok_${job.id}`,
          }));
        allJobs.push(...remoteJobs);
        console.log(`Added ${remoteJobs.length} RemoteOK jobs`);
      }
    } catch (error) {
      console.error('Error fetching RemoteOK jobs:', error);
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

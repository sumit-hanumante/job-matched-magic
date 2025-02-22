
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  title: string;
  company: string;
  description: string;
  location: string;
  salary_range?: string;
  apply_url: string;
  external_job_id: string;
  source: string;
  requirements?: string[];
  posted_date: string;
}

async function scrapeRemoteOkJobs(): Promise<Job[]> {
  console.log('Scraping RemoteOK jobs...');
  const response = await fetch('https://remoteok.com/api');
  const data = await response.json();
  
  return data
    .filter((job: any) => job.position && job.company) // Filter out non-job entries
    .map((job: any) => ({
      title: job.position,
      company: job.company,
      description: job.description || '',
      location: job.location || 'Remote',
      salary_range: job.salary,
      apply_url: job.url,
      external_job_id: job.id.toString(),
      source: 'remoteok',
      requirements: job.tags || [],
      posted_date: new Date(job.date).toISOString()
    }));
}

async function scrapeGithubJobs(): Promise<Job[]> {
  console.log('Scraping GitHub jobs...');
  try {
    const response = await fetch('https://jobs.github.com/api/positions.json');
    const data = await response.json();
    
    return data.map((job: any) => ({
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      apply_url: job.url,
      external_job_id: job.id,
      source: 'github',
      requirements: [],
      posted_date: new Date(job.created_at).toISOString()
    }));
  } catch (error) {
    console.error('Error scraping GitHub jobs:', error);
    return [];
  }
}

async function scrapeLinkedinJobs(): Promise<Job[]> {
  console.log('Scraping LinkedIn jobs...');
  // Using a sample search for software engineering jobs
  try {
    const response = await fetch('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=software%20engineer&location=United%20States&geoId=103644278&trk=public_jobs_jobs-search-bar_search-submit&start=0', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    // Parse the HTML response
    const jobs: Job[] = [];
    // Basic regex pattern to extract job info from HTML
    const jobPattern = /<div class="job-card-container".*?data-job-id="(\d+)".*?<h3.*?>(.*?)<\/h3>.*?<h4.*?>(.*?)<\/h4>.*?<span class="job-card-location">(.*?)<\/span>/gs;
    
    let match;
    while ((match = jobPattern.exec(text)) !== null) {
      jobs.push({
        external_job_id: match[1],
        title: match[2].trim(),
        company: match[3].trim(),
        location: match[4].trim(),
        description: 'Visit LinkedIn for full description',
        apply_url: `https://www.linkedin.com/jobs/view/${match[1]}/`,
        source: 'linkedin',
        posted_date: new Date().toISOString()
      });
    }
    
    return jobs;
  } catch (error) {
    console.error('Error scraping LinkedIn jobs:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Starting job scraping...');

    // Scrape jobs from multiple sources in parallel
    const [remoteOkJobs, githubJobs, linkedinJobs] = await Promise.all([
      scrapeRemoteOkJobs(),
      scrapeGithubJobs(),
      scrapeLinkedinJobs()
    ]);

    const allJobs = [...remoteOkJobs, ...githubJobs, ...linkedinJobs];
    console.log(`Found ${allJobs.length} jobs in total`);

    // Clean up job descriptions to remove special characters
    const cleanJobs = allJobs.map(job => ({
      ...job,
      description: job.description ? job.description.replace(/[^\x20-\x7E\n\r\t]/g, '') : ''
    }));

    // Get existing job IDs to avoid duplicates
    const { data: existingJobs } = await supabase
      .from('jobs')
      .select('external_job_id');

    const existingIds = new Set(existingJobs?.map(job => job.external_job_id));

    // Filter out existing jobs
    const newJobs = cleanJobs.filter(job => !existingIds.has(job.external_job_id));
    console.log(`Found ${newJobs.length} new jobs to insert`);

    if (newJobs.length > 0) {
      const { error: insertError } = await supabase
        .from('jobs')
        .insert(newJobs);

      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and inserted ${newJobs.length} new jobs`,
        jobCounts: {
          remoteOk: remoteOkJobs.length,
          github: githubJobs.length,
          linkedin: linkedinJobs.length
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-jobs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

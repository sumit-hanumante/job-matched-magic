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

async function scrapeGithubJobs(): Promise<Job[]> {
  console.log('Scraping GitHub jobs...');
  try {
    const response = await fetch('https://jobs.github.com/positions.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    
    return data.map((job: any) => ({
      title: job.title,
      company: job.company,
      description: job.description,
      location: job.location,
      apply_url: job.url,
      external_job_id: job.id,
      source: 'github',
      requirements: [], // GitHub API doesn't provide requirements separately
      posted_date: new Date(job.created_at).toISOString()
    }));
  } catch (error) {
    console.error('Error scraping GitHub jobs:', error);
    return [];
  }
}

async function scrapeLinkedinJobs(): Promise<Job[]> {
  console.log('Scraping LinkedIn jobs...');
  try {
    // We'll fetch software engineering jobs as a sample
    const urls = [
      'software-engineer',
      'frontend-developer',
      'backend-developer',
      'fullstack-developer'
    ].map(keyword => 
      `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${keyword}&location=United%20States&geoId=103644278&start=0`
    );

    const jobs: Job[] = [];
    
    for (const url of urls) {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch LinkedIn jobs for URL: ${url}`);
        continue;
      }
      
      const text = await response.text();
      const jobPattern = /<div class="base-card relative.*?job-search-card.*?data-entity-urn="([^"]+)".*?<h3.*?base-search-card__title">(.*?)<\/h3>.*?<h4.*?base-search-card__subtitle">(.*?)<\/h4>.*?<span class="job-search-card__location">(.*?)<\/span>/gs;
      
      let match;
      while ((match = jobPattern.exec(text)) !== null) {
        const jobId = match[1].split(':').pop();
        const title = match[2].replace(/<[^>]*>/g, '').trim();
        const company = match[3].replace(/<[^>]*>/g, '').trim();
        const location = match[4].replace(/<[^>]*>/g, '').trim();
        
        if (jobId && title && company) {
          jobs.push({
            external_job_id: jobId,
            title,
            company,
            location,
            description: 'Click to view full job description on LinkedIn',
            apply_url: `https://www.linkedin.com/jobs/view/${jobId}/`,
            source: 'linkedin',
            requirements: [],
            posted_date: new Date().toISOString()
          });
        }
      }
    }
    
    // Remove duplicates based on external_job_id
    return Array.from(new Map(jobs.map(job => [job.external_job_id, job])).values());
  } catch (error) {
    console.error('Error scraping LinkedIn jobs:', error);
    return [];
  }
}

async function scrapeGoogleJobs(): Promise<Job[]> {
  console.log('Scraping Google jobs...');
  try {
    // Implementation for Google Jobs API
    // This is just a placeholder since we need the actual API key and implementation
    return [];
  } catch (error) {
    console.error('Error scraping Google jobs:', error);
    return [];
  }
}

async function scrapeAmazonJobs(): Promise<Job[]> {
  console.log('Scraping Amazon jobs...');
  try {
    // Implementation for Amazon Jobs API
    // This is just a placeholder since we need the actual API implementation
    return [];
  } catch (error) {
    console.error('Error scraping Amazon jobs:', error);
    return [];
  }
}

async function scrapeMicrosoftJobs(): Promise<Job[]> {
  console.log('Scraping Microsoft jobs...');
  try {
    // Implementation for Microsoft Jobs API
    // This is just a placeholder since we need the actual API implementation
    return [];
  } catch (error) {
    console.error('Error scraping Microsoft jobs:', error);
    return [];
  }
}

async function scrapeAppleJobs(): Promise<Job[]> {
  console.log('Scraping Apple jobs...');
  try {
    // Implementation for Apple Jobs API
    // This is just a placeholder since we need the actual API implementation
    return [];
  } catch (error) {
    console.error('Error scraping Apple jobs:', error);
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
    
    console.log('Starting job scraping from all sources...');

    // Scrape jobs from all sources in parallel, excluding RemoteOK
    const [
      githubJobs,
      linkedinJobs,
      googleJobs,
      amazonJobs,
      microsoftJobs,
      appleJobs
    ] = await Promise.all([
      scrapeGithubJobs(),
      scrapeLinkedinJobs(),
      scrapeGoogleJobs(),
      scrapeAmazonJobs(),
      scrapeMicrosoftJobs(),
      scrapeAppleJobs()
    ]);

    const allJobs = [
      ...githubJobs,
      ...linkedinJobs,
      ...googleJobs,
      ...amazonJobs,
      ...microsoftJobs,
      ...appleJobs
    ];

    console.log(`Found ${allJobs.length} jobs in total`);

    // Clean up job descriptions
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
          github: githubJobs.length,
          linkedin: linkedinJobs.length,
          google: googleJobs.length,
          amazon: amazonJobs.length,
          microsoft: microsoftJobs.length,
          apple: appleJobs.length,
          total: allJobs.length
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

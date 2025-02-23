
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Pune'];

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

async function scrapeLinkedInJobs(city: string, scrapingAntKey: string): Promise<Job[]> {
  console.log(`Starting LinkedIn scraping for ${city}`);
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=software%20developer&location=${encodeURIComponent(city)}%2C%20India&position=1&pageNum=0`;
    const scrapingUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(searchUrl)}`;

    const response = await fetch(scrapingUrl, {
      headers: { 'x-api-key': scrapingAntKey }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn scraping failed: ${response.status}`);
    }

    const html = await response.text();
    console.log('LinkedIn HTML length:', html.length);

    // For now returning a test job
    return [{
      title: "Software Developer",
      company: "Test Company",
      location: city,
      description: "Test LinkedIn job description",
      apply_url: "https://linkedin.com/jobs/test",
      source: "linkedin",
      external_job_id: `li_${Date.now()}`
    }];
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
    return [];
  }
}

async function scrapeNaukriJobs(city: string, scrapingAntKey: string): Promise<Job[]> {
  console.log(`Starting Naukri scraping for ${city}`);
  try {
    const searchUrl = `https://www.naukri.com/software-developer-jobs-in-${city.toLowerCase()}`;
    const scrapingUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(searchUrl)}`;

    const response = await fetch(scrapingUrl, {
      headers: { 'x-api-key': scrapingAntKey }
    });

    if (!response.ok) {
      throw new Error(`Naukri scraping failed: ${response.status}`);
    }

    const html = await response.text();
    console.log('Naukri HTML length:', html.length);

    // For now returning a test job
    return [{
      title: "Software Developer",
      company: "Test Naukri Company",
      location: city,
      description: "Test Naukri job description",
      apply_url: "https://naukri.com/jobs/test",
      source: "naukri",
      external_job_id: `naukri_${Date.now()}`
    }];
  } catch (error) {
    console.error('Naukri scraping error:', error);
    return [];
  }
}

async function scrapeIndeedJobs(city: string, scrapingAntKey: string): Promise<Job[]> {
  console.log(`Starting Indeed scraping for ${city}`);
  try {
    const searchUrl = `https://www.indeed.co.in/jobs?q=software+developer&l=${encodeURIComponent(city)}`;
    const scrapingUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(searchUrl)}`;

    const response = await fetch(scrapingUrl, {
      headers: { 'x-api-key': scrapingAntKey }
    });

    if (!response.ok) {
      throw new Error(`Indeed scraping failed: ${response.status}`);
    }

    const html = await response.text();
    console.log('Indeed HTML length:', html.length);

    // For now returning a test job
    return [{
      title: "Software Developer",
      company: "Test Indeed Company",
      location: city,
      description: "Test Indeed job description",
      apply_url: "https://indeed.com/jobs/test",
      source: "indeed",
      external_job_id: `indeed_${Date.now()}`
    }];
  } catch (error) {
    console.error('Indeed scraping error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting job scraping process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const scrapingAntKey = Deno.env.get('SCRAPINGANT_API_KEY');
    
    if (!supabaseUrl || !supabaseKey || !scrapingAntKey) {
      throw new Error('Missing required environment variables');
    }
    
    console.log('Environment variables loaded successfully');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let allJobs: Job[] = [];

    // Scrape jobs from all sources for each city
    for (const city of TARGET_CITIES) {
      console.log(`Processing city: ${city}`);
      const [linkedInJobs, naukriJobs, indeedJobs] = await Promise.all([
        scrapeLinkedInJobs(city, scrapingAntKey),
        scrapeNaukriJobs(city, scrapingAntKey),
        scrapeIndeedJobs(city, scrapingAntKey)
      ]);

      allJobs = [...allJobs, ...linkedInJobs, ...naukriJobs, ...indeedJobs];
    }

    console.log(`Total jobs scraped: ${allJobs.length}`);

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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${allJobs.length} jobs`,
        jobCounts: {
          linkedin: allJobs.filter(j => j.source === 'linkedin').length,
          naukri: allJobs.filter(j => j.source === 'naukri').length,
          indeed: allJobs.filter(j => j.source === 'indeed').length
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Fatal error in scrape-jobs function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

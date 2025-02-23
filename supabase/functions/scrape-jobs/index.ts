
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
  console.log(`Starting LinkedIn scraping for ${city} with key length: ${scrapingAntKey.length}`);
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=software%20developer&location=${encodeURIComponent(city)}%2C%20India&position=1&pageNum=0`;
    console.log(`LinkedIn search URL: ${searchUrl}`);
    
    const scrapingUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(searchUrl)}`;
    console.log(`Calling ScrapingAnt URL: ${scrapingUrl}`);

    const fetchOptions = {
      method: 'GET',
      headers: { 
        'x-api-key': scrapingAntKey,
        'accept': 'text/html,application/xhtml+xml'
      }
    };
    console.log('Fetch options:', JSON.stringify(fetchOptions, null, 2));

    const response = await fetch(scrapingUrl, fetchOptions);
    console.log('ScrapingAnt Response Status:', response.status);
    console.log('ScrapingAnt Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ScrapingAnt Error Response:', errorText);
      throw new Error(`LinkedIn scraping failed: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Received HTML content length:', html.length);
    console.log('First 500 chars of HTML:', html.substring(0, 500));

    // For now, let's return a test job to verify the pipeline
    const testJob: Job = {
      title: "Test Software Developer Position",
      company: "Test Company",
      location: city,
      description: "This is a test job to verify the scraping pipeline",
      apply_url: "https://linkedin.com/jobs",
      source: "linkedin",
      external_job_id: `li_test_${Date.now()}`,
      requirements: ["Testing"]
    };

    return [testJob];
  } catch (error) {
    console.error('Detailed error in LinkedIn scraping:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
      console.error('Missing environment variables:',
        !supabaseUrl ? 'SUPABASE_URL' : '',
        !supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY' : '',
        !scrapingAntKey ? 'SCRAPINGANT_API_KEY' : ''
      );
      throw new Error('Missing required environment variables');
    }
    
    console.log('Environment variables loaded successfully');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test LinkedIn scraping first
    console.log('Initiating LinkedIn scraping test...');
    const linkedInJobs = await scrapeLinkedInJobs('Mumbai', scrapingAntKey);
    console.log(`LinkedIn scraping results:`, linkedInJobs);

    if (linkedInJobs.length === 0) {
      console.log('No LinkedIn jobs found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'LinkedIn scraping test failed - no jobs found'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Preparing to insert jobs into database');
    const { data, error } = await supabase
      .from('jobs')
      .insert(linkedInJobs.map(job => ({
        ...job,
        posted_date: new Date().toISOString(),
        last_scraped_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      throw error;
    }

    console.log(`Successfully inserted jobs:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${data?.length} LinkedIn jobs`,
        jobCounts: {
          linkedin: data?.length || 0
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

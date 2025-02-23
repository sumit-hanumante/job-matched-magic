import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38-alpha/deno-dom-wasm.ts";

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
  console.log(`Scraping LinkedIn jobs for ${city}...`);
  try {
    const searchUrl = `https://www.linkedin.com/jobs/search?keywords=software%20developer&location=${encodeURIComponent(city)}%2C%20India&position=1&pageNum=0`;
    console.log(`Fetching LinkedIn URL: ${searchUrl}`);
    
    const response = await fetch(
      `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(searchUrl)}`,
      {
        headers: { 'x-api-key': scrapingAntKey }
      }
    );

    if (!response.ok) {
      throw new Error(`LinkedIn scraping failed for ${city}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log('Received HTML response length:', html.length);

    const dom = new DOMParser().parseFromString(html, 'text/html');
    if (!dom) {
      throw new Error('Failed to parse HTML');
    }

    const jobCards = dom.querySelectorAll('.job-search-card');
    console.log(`Found ${jobCards.length} job cards for ${city}`);

    const jobs: Job[] = [];
    
    jobCards.forEach((card) => {
      try {
        const titleElement = card.querySelector('.job-search-card__title');
        const companyElement = card.querySelector('.job-search-card__company-name');
        const locationElement = card.querySelector('.job-search-card__location');
        const linkElement = card.querySelector('a.job-search-card__link');
        
        if (!titleElement || !companyElement || !locationElement || !linkElement) {
          console.log('Skipping incomplete job card');
          return;
        }

        const jobId = linkElement.getAttribute('data-entity-urn')?.split(':').pop() || Date.now().toString();
        const applyUrl = linkElement.getAttribute('href') || '';
        
        const job: Job = {
          title: titleElement.textContent?.trim() || 'Untitled Position',
          company: companyElement.textContent?.trim() || 'Unknown Company',
          location: `${locationElement.textContent?.trim()}, ${city}`,
          description: '', // We'll fetch full description later if needed
          apply_url: applyUrl,
          source: 'linkedin',
          external_job_id: `li_${jobId}`,
          requirements: []
        };

        // Try to extract salary information if present
        const salaryElement = card.querySelector('.job-search-card__salary-info');
        if (salaryElement) {
          job.salary_range = salaryElement.textContent?.trim();
        }

        jobs.push(job);
      } catch (error) {
        console.error('Error processing job card:', error);
      }
    });

    console.log(`Successfully extracted ${jobs.length} LinkedIn jobs for ${city}`);
    return jobs;
  } catch (error) {
    console.error(`Error scraping LinkedIn jobs for ${city}:`, error);
    console.error('Error details:', error instanceof Error ? error.stack : '');
    return [];
  }
}

async function scrapeIndeedJobs(city: string, apiDevKey: string): Promise<Job[]> {
  console.log(`Scraping Indeed jobs for ${city}...`);
  try {
    const response = await fetch(
      `https://api.apidev.co/indeed?q=software&l=${encodeURIComponent(city)}`,
      {
        headers: { 'Authorization': `Bearer ${apiDevKey}` }
      }
    );

    if (!response.ok) {
      throw new Error(`Indeed scraping failed for ${city}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Raw Indeed API response for ${city}:`, data);

    // Transform Indeed jobs to our format
    const jobs: Job[] = Array.isArray(data) ? data.map((job: any) => ({
      title: String(job.title || '').slice(0, 255),
      company: String(job.company || '').slice(0, 255),
      location: city,
      description: String(job.description || ''),
      apply_url: String(job.url || ''),
      source: 'indeed',
      external_job_id: `indeed_${job.id || Date.now()}`,
      requirements: extractRequirements(job.description || ''),
      salary_range: job.salary || undefined
    })) : [];

    console.log(`Successfully processed ${jobs.length} Indeed jobs for ${city}`);
    return jobs;
  } catch (error) {
    console.error(`Error scraping Indeed jobs for ${city}:`, error);
    return [];
  }
}

async function scrapeRemoteOkJobs(): Promise<Job[]> {
  console.log('Scraping RemoteOK jobs...');
  try {
    const response = await fetch('https://remoteok.io/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JobScraperBot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`RemoteOK scraping failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw RemoteOK API response:', data);

    // Transform RemoteOK jobs to our format
    const jobs: Job[] = Array.isArray(data) ? data.map((job: any) => ({
      title: String(job.position || '').slice(0, 255),
      company: String(job.company || '').slice(0, 255),
      location: 'Remote',
      description: String(job.description || ''),
      apply_url: String(job.url || ''),
      source: 'remoteok',
      external_job_id: `rok_${job.id || Date.now()}`,
      requirements: extractRequirements(job.description || ''),
      salary_range: job.salary || undefined
    })) : [];

    console.log(`Successfully processed ${jobs.length} RemoteOK jobs`);
    return jobs;
  } catch (error) {
    console.error('Error scraping RemoteOK jobs:', error);
    return [];
  }
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  
  if (!description) return requirements;
  
  const requirementPatterns = [
    /requirements?:/i,
    /qualifications?:/i,
    /what you('ll)? need:/i,
    /what we('re)? looking for:/i,
    /must have:/i,
    /key skills?:/i
  ];
  
  requirementPatterns.forEach(pattern => {
    const match = description.match(new RegExp(`${pattern.source}([^]*?)(?=\\n\\n|$)`, 'i'));
    if (match) {
      const requirementSection = match[1];
      const bullets = requirementSection.match(/[•\-\*]\s*([^\n]+)/g) || 
                     requirementSection.match(/\d+\.\s*([^\n]+)/g);
      
      if (bullets) {
        bullets.forEach(bullet => {
          const cleaned = bullet.replace(/[•\-\*\d+\.]\s*/, '').trim();
          if (cleaned && !requirements.includes(cleaned)) {
            requirements.push(cleaned);
          }
        });
      }
    }
  });
  
  return requirements;
}

function extractSalaryRange(description: string): { range?: string; min?: number; max?: number } {
  if (!description) return {};
  
  // Indian salary patterns (in lakhs)
  const salaryPatterns = [
    /(?:₹|RS|INR)\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i,
    /(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i,
    /(?:₹|RS|INR)\s*(\d+(?:\.\d+)?)\s*(?:L|LAKHS?|LPA)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[2]) {
        const min = parseFloat(match[1]) * 100000; // Convert lakhs to rupees
        const max = parseFloat(match[2]) * 100000;
        return {
          range: `₹${match[1]}L - ₹${match[2]}L`,
          min,
          max
        };
      } else {
        const amount = parseFloat(match[1]) * 100000;
        return {
          range: `₹${match[1]}L`,
          min: amount,
          max: amount
        };
      }
    }
  }

  return {};
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
    const apiDevKey = Deno.env.get('APIDEV_API_KEY');
    
    if (!supabaseUrl || !supabaseKey || !scrapingAntKey || !apiDevKey) {
      throw new Error('Missing required environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Let's test LinkedIn scraping first
    console.log('Testing LinkedIn scraping...');
    const linkedInJobs = await scrapeLinkedInJobs('Mumbai', scrapingAntKey);
    console.log(`LinkedIn scraping test results: ${linkedInJobs.length} jobs found`);

    if (linkedInJobs.length === 0) {
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

    // If we got jobs, let's save them
    const { data, error } = await supabase
      .from('jobs')
      .insert(linkedInJobs.map(job => ({
        ...job,
        posted_date: new Date().toISOString(),
        last_scraped_at: new Date().toISOString()
      })))
      .select();

    if (error) {
      console.error('Error inserting LinkedIn jobs:', error);
      throw error;
    }

    console.log(`Successfully inserted ${data?.length} LinkedIn jobs`);

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
    console.error('Error in scrape-jobs function:', error);
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

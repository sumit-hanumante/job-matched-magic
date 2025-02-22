
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  source: string;
  external_job_id?: string;
}

async function scrapeGithubJobs(): Promise<Job[]> {
  console.log('Scraping Github jobs...');
  try {
    const response = await fetch('https://jobs.github.com/positions.json');
    if (!response.ok) throw new Error('Failed to fetch Github jobs');
    
    const data = await response.json();
    return data.map((job: any) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      description: job.description,
      apply_url: job.url,
      source: 'github',
      external_job_id: `gh_${job.id}`,
      requirements: extractRequirements(job.description),
      salary_range: extractSalaryRange(job.description)
    }));
  } catch (error) {
    console.error('Error scraping Github jobs:', error);
    return [];
  }
}

async function scrapeRemoteOkJobs(): Promise<Job[]> {
  console.log('Scraping RemoteOK jobs...');
  try {
    const response = await fetch('https://remoteok.io/api', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) throw new Error('Failed to fetch RemoteOK jobs');
    
    const data = await response.json();
    // Remove the first item as it's usually metadata
    const jobs = data.slice(1);
    
    return jobs.map((job: any) => ({
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description: job.description,
      apply_url: job.url,
      source: 'remoteok',
      external_job_id: `rok_${job.id}`,
      requirements: extractRequirements(job.description),
      salary_range: job.salary || extractSalaryRange(job.description)
    }));
  } catch (error) {
    console.error('Error scraping RemoteOK jobs:', error);
    return [];
  }
}

function extractRequirements(description: string): string[] {
  const requirements: string[] = [];
  
  // Common requirement indicators
  const requirementPatterns = [
    /requirements?:/i,
    /qualifications?:/i,
    /what you('ll)? need:/i,
    /what we('re)? looking for:/i,
    /must have:/i
  ];
  
  // Look for bullet points or numbered lists after requirement indicators
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

function extractSalaryRange(description: string): string | undefined {
  const salaryPatterns = [
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*-\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i,
    /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k\s*-\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*k/i,
    /salary:\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/i
  ];

  for (const pattern of salaryPatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[2]) {
        return `$${match[1]} - $${match[2]}${pattern.source.includes('k') ? 'K' : ''}`;
      } else {
        return `$${match[1]}`;
      }
    }
  }

  return undefined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('Starting job scraping process...');

    // Scrape jobs from all sources in parallel
    const [githubJobs, remoteOkJobs] = await Promise.all([
      scrapeGithubJobs(),
      scrapeRemoteOkJobs()
    ]);

    const allJobs = [...githubJobs, ...remoteOkJobs];

    console.log(`Found ${allJobs.length} jobs in total`);

    // Insert new jobs into the database
    if (allJobs.length > 0) {
      // First, mark old jobs as expired
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      await supabase
        .from('jobs')
        .delete()
        .lt('posted_date', sixtyDaysAgo.toISOString());

      // Insert new jobs
      const { data: newJobs, error } = await supabase
        .from('jobs')
        .upsert(
          allJobs.map(job => ({
            ...job,
            posted_date: new Date().toISOString(),
            last_scraped_at: new Date().toISOString()
          })),
          { 
            onConflict: 'external_job_id',
            ignoreDuplicates: true 
          }
        );

      if (error) throw error;

      console.log(`Successfully inserted/updated ${newJobs?.length || 0} jobs`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully scraped and processed ${allJobs.length} jobs`,
        jobCounts: {
          github: githubJobs.length,
          remoteok: remoteOkJobs.length,
          total: allJobs.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

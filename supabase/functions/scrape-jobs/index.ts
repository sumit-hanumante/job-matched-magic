
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
  posted_date?: string;
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
                  posted_date: new Date().toISOString()
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

    // GitHub Jobs API (Free) - Using GitHub's RSS Feed instead of Dev.to
    try {
      console.log('Fetching GitHub jobs...');
      const response = await fetch('https://jobs.github.com/positions.json');
      const data = await response.json();
      
      if (Array.isArray(data)) {
        const githubJobs = data.map((job: any) => ({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          apply_url: job.url,
          requirements: extractRequirements(job.description),
          source: 'github',
          external_job_id: `gh_${job.id}`,
          posted_date: new Date(job.created_at).toISOString()
        }));
        allJobs.push(...githubJobs);
        console.log(`Added ${githubJobs.length} GitHub jobs`);
      }
    } catch (error) {
      console.error('Error fetching GitHub jobs:', error);
      
      // Fallback to Stack Overflow jobs RSS feed
      try {
        console.log('Fetching Stack Overflow jobs as fallback...');
        const response = await fetch('https://stackoverflow.com/jobs/feed');
        const text = await response.text();
        const jobs = await parseStackOverflowRSS(text);
        allJobs.push(...jobs);
        console.log(`Added ${jobs.length} Stack Overflow jobs`);
      } catch (fallbackError) {
        console.error('Error fetching Stack Overflow jobs:', fallbackError);
      }
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
                salary_range: extractSalaryFromDescription(job.description),
                requirements: extractRequirements(job.description),
                source: 'indeed',
                external_job_id: job.jobId,
                posted_date: new Date().toISOString()
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
            requirements: extractRequirements(job.description),
            source: 'remoteok',
            external_job_id: `rok_${job.id}`,
            posted_date: new Date(job.date).toISOString()
          }));
        allJobs.push(...remoteJobs);
        console.log(`Added ${remoteJobs.length} RemoteOK jobs`);
      }
    } catch (error) {
      console.error('Error fetching RemoteOK jobs:', error);
    }

    // Helper function to extract requirements from job description
    function extractRequirements(description: string): string[] {
      if (!description) return [];
      
      const requirements: string[] = [];
      
      // Look for common requirement patterns
      const requirementSections = description.match(/requirements:.*?(?=\n\n|\n[A-Z]|$)/gis) || [];
      const bulletPoints = description.match(/[•\-\*]\s*([^•\n]+)/g) || [];
      const yearsExp = description.match(/\d+\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/gi) || [];
      
      // Extract skills (common programming languages, frameworks, tools)
      const skills = [
        'JavaScript', 'Python', 'Java', 'C\\+\\+', 'Ruby', 'PHP',
        'React', 'Angular', 'Vue', 'Node.js', 'Express',
        'AWS', 'Docker', 'Kubernetes', 'Git',
        'SQL', 'MongoDB', 'PostgreSQL'
      ];
      const skillRegex = new RegExp(`\\b(${skills.join('|')})\\b`, 'gi');
      const foundSkills = description.match(skillRegex) || [];
      
      // Combine all findings
      requirements.push(
        ...requirementSections,
        ...bulletPoints.map(point => point.replace(/^[•\-\*]\s*/, '')),
        ...yearsExp,
        ...foundSkills
      );
      
      // Remove duplicates and clean up
      return [...new Set(requirements)]
        .map(req => req.trim())
        .filter(req => req.length > 0);
    }

    // Helper function to extract salary from description
    function extractSalaryFromDescription(description: string): string {
      if (!description) return '';
      
      // Look for common salary patterns
      const salaryPatterns = [
        /\$\d{2,3}(?:,\d{3})+(?:\s*-\s*\$\d{2,3}(?:,\d{3})+)?/g, // $50,000 - $100,000
        /\d{2,3}(?:,\d{3})+\s*(?:USD|INR)/g, // 50,000 USD
        /(?:USD|INR)\s*\d{2,3}(?:,\d{3})+/g, // USD 50,000
      ];
      
      for (const pattern of salaryPatterns) {
        const match = description.match(pattern);
        if (match) return match[0];
      }
      
      return '';
    }

    // Helper function to parse Stack Overflow RSS feed
    async function parseStackOverflowRSS(xml: string): Promise<Job[]> {
      const jobs: Job[] = [];
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      
      items.forEach(item => {
        const title = item.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const description = item.match(/<description>(.*?)<\/description>/)?.[1] || '';
        const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
        
        if (title && link) {
          jobs.push({
            title: title,
            company: extractCompanyFromTitle(title),
            location: extractLocationFromDescription(description) || 'Remote',
            description: cleanDescription(description),
            apply_url: link,
            requirements: extractRequirements(description),
            source: 'stackoverflow',
            external_job_id: `so_${link.split('/').pop()}`,
            posted_date: new Date(pubDate).toISOString()
          });
        }
      });
      
      return jobs;
    }

    function extractCompanyFromTitle(title: string): string {
      const match = title.match(/at\s+([^(]+)/);
      return match ? match[1].trim() : 'Unknown Company';
    }

    function extractLocationFromDescription(description: string): string {
      const match = description.match(/Location:\s*([^<\n]+)/i);
      return match ? match[1].trim() : '';
    }

    function cleanDescription(description: string): string {
      return description
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, '') // Remove HTML entities
        .trim();
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
        .insert(allJobs.map(job => ({
          ...job,
          posted_date: job.posted_date || new Date().toISOString()
        })));

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

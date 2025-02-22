
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
  last_scraped_at?: string;
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

    // RemoteOK API (Free and reliable)
    try {
      console.log('Fetching RemoteOK jobs...');
      const response = await fetch('https://remoteok.com/api?tag=dev', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) throw new Error(`RemoteOK API error: ${response.status}`);
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        const remoteJobs = data
          .filter((job: any) => job.position && job.company && job.url) // Ensure required fields exist
          .map((job: any) => ({
            title: job.position,
            company: job.company,
            location: job.location || 'Remote',
            description: cleanDescription(job.description || ''),
            apply_url: ensureValidUrl(job.url),
            salary_range: job.salary || '',
            requirements: extractRequirements(job.description || ''),
            source: 'remoteok',
            external_job_id: `rok_${job.id}`,
            last_scraped_at: new Date().toISOString()
          }));
          
        console.log(`Processed ${remoteJobs.length} RemoteOK jobs`);
        allJobs.push(...remoteJobs);
      }
    } catch (error) {
      console.error('Error fetching RemoteOK jobs:', error);
    }

    // WeWorkRemotely API (Free and reliable)
    try {
      console.log('Fetching WeWorkRemotely jobs...');
      const response = await fetch('https://weworkremotely.com/categories/remote-programming-jobs.json');
      
      if (!response.ok) throw new Error(`WeWorkRemotely API error: ${response.status}`);
      
      const data = await response.json();
      
      if (data.jobs && Array.isArray(data.jobs)) {
        const weworkJobs = data.jobs
          .filter((job: any) => job.title && job.company_name && job.url)
          .map((job: any) => ({
            title: job.title,
            company: job.company_name,
            location: job.region || 'Remote',
            description: cleanDescription(job.description || ''),
            apply_url: ensureValidUrl(job.url),
            requirements: extractRequirements(job.description || ''),
            source: 'weworkremotely',
            external_job_id: `wwr_${job.id}`,
            last_scraped_at: new Date().toISOString()
          }));
          
        console.log(`Processed ${weworkJobs.length} WeWorkRemotely jobs`);
        allJobs.push(...weworkJobs);
      }
    } catch (error) {
      console.error('Error fetching WeWorkRemotely jobs:', error);
    }

    function ensureValidUrl(url: string): string {
      try {
        const urlObj = new URL(url);
        return urlObj.toString();
      } catch {
        // If URL is relative, assume it's from the job source domain
        if (url.startsWith('/')) {
          return `https://remoteok.com${url}`;
        }
        return url;
      }
    }

    function cleanDescription(description: string): string {
      return description
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&[^;]+;/g, ' ') // Replace HTML entities with spaces
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }

    function extractRequirements(description: string): string[] {
      if (!description) return [];
      
      const requirements: string[] = [];
      
      // Common technologies and skills
      const skills = [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'Ruby', 'PHP',
        'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Next.js',
        'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
        'SQL', 'MongoDB', 'PostgreSQL', 'MySQL',
        'Git', 'CI/CD', 'Agile', 'Scrum'
      ];

      // Look for requirements section
      const reqSection = description.match(/requirements?:?(.*?)(?:\n\n|\n[A-Z]|$)/is);
      if (reqSection) {
        const bullets = reqSection[1].split(/\n/).filter(line => line.trim());
        requirements.push(...bullets);
      }

      // Extract years of experience
      const expMatches = description.match(/\d+\+?\s*(?:years?|yrs?)(?:\s+of)?\s+experience/gi) || [];
      requirements.push(...expMatches);

      // Extract mentioned skills
      const skillRegex = new RegExp(`\\b(${skills.join('|')})\\b`, 'gi');
      const foundSkills = [...new Set(description.match(skillRegex) || [])];
      requirements.push(...foundSkills);

      return [...new Set(requirements)]
        .map(req => req.trim())
        .filter(req => req.length > 0);
    }

    console.log(`Total jobs collected: ${allJobs.length}`);

    if (allJobs.length > 0) {
      // Delete old jobs from the same sources we're updating
      const sources = [...new Set(allJobs.map(job => job.source))];
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .in('source', sources);

      if (deleteError) {
        console.error('Error deleting old jobs:', deleteError);
        throw deleteError;
      }

      // Insert new jobs in batches to avoid request size limits
      const batchSize = 50;
      for (let i = 0; i < allJobs.length; i += batchSize) {
        const batch = allJobs.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('jobs')
          .insert(batch);

        if (insertError) {
          console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError);
          throw insertError;
        }
        console.log(`Inserted batch ${i / batchSize + 1} of ${Math.ceil(allJobs.length / batchSize)}`);
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

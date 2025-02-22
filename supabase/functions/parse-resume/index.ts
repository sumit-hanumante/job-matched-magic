
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResume {
  skills: string[];
  experience: string;
  salary?: string;
  preferredLocations: string[];
  education: string[];
  jobTitle: string;
  preferredCompanies: string[];
  languages: string[];
  certifications: string[];
  preferredWorkType?: 'remote' | 'hybrid' | 'onsite';
  minSalary?: number;
  maxSalary?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, userId, resumeId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download resume content
    const response = await fetch(resumeUrl);
    const text = await response.text();

    // Initialize Gemini AI
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `Analyze this resume text and extract the following information in JSON format:
      - List of technical and soft skills
      - Total years of experience
      - Current/expected salary range
      - Preferred job locations or willing to relocate information
      - Educational qualifications
      - Current/Last job title
      - List of companies the candidate would prefer to work for (based on past experience and industry)
      - Languages known
      - Certifications
      - Preferred work type (remote/hybrid/onsite) if mentioned
      - Any salary expectations mentioned

      Also analyze:
      - The type of companies they've worked for (startups, MNCs, etc.)
      - Their career progression
      - Industry focus

      Return as JSON with this structure:
      {
        "skills": [],
        "experience": "",
        "salary": "",
        "preferredLocations": [],
        "education": [],
        "jobTitle": "",
        "preferredCompanies": [],
        "languages": [],
        "certifications": [],
        "preferredWorkType": "",
        "minSalary": null,
        "maxSalary": null
      }`;

    console.log('Analyzing resume with Gemini AI...');
    const result = await model.generateContent([text, prompt]);
    const response = await result.response;
    const parsedData = JSON.parse(response.text()) as ParsedResume;

    console.log('Resume parsed successfully:', parsedData);

    // Extract salary range if present
    let minSalary = null;
    let maxSalary = null;
    if (parsedData.salary) {
      const numbers = parsedData.salary.match(/\d+/g);
      if (numbers && numbers.length >= 1) {
        minSalary = parseInt(numbers[0]) * 1000; // Assuming numbers are in K
        maxSalary = numbers.length > 1 ? parseInt(numbers[1]) * 1000 : minSalary;
      }
    }

    // Update resume record with parsed data
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        extracted_skills: parsedData.skills,
        experience: parsedData.experience,
        preferred_locations: parsedData.preferredLocations,
        preferred_companies: parsedData.preferredCompanies,
        min_salary: minSalary,
        max_salary: maxSalary,
        preferred_work_type: parsedData.preferredWorkType,
        status: 'processed',
        parsed_data: parsedData
      })
      .eq('id', resumeId);

    if (updateError) throw updateError;

    // Generate initial job matches
    console.log('Generating initial job matches...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('posted_date', { ascending: false });

    if (jobsError) throw jobsError;

    // Calculate match scores for each job
    const matchPromises = jobs.map(async (job) => {
      const scores = {
        skill_match_score: 0,
        location_match_score: 0,
        company_match_score: 0,
        salary_match_score: 0
      };

      // Calculate skill match score
      scores.skill_match_score = parsedData.skills.reduce((score, skill) => {
        const skillLower = skill.toLowerCase();
        if (job.title.toLowerCase().includes(skillLower) ||
            job.description.toLowerCase().includes(skillLower) ||
            (job.requirements || []).some(req => req.toLowerCase().includes(skillLower))) {
          return score + 1;
        }
        return score;
      }, 0) / parsedData.skills.length;

      // Calculate location match score
      scores.location_match_score = parsedData.preferredLocations.some(loc =>
        job.location.toLowerCase().includes(loc.toLowerCase())
      ) ? 1 : 0;

      // Calculate company match score
      scores.company_match_score = parsedData.preferredCompanies.some(comp =>
        job.company.toLowerCase().includes(comp.toLowerCase())
      ) ? 1 : 0;

      // Calculate salary match score
      if (minSalary && job.salary_range) {
        const jobSalaryMatch = job.salary_range.match(/\d+/g);
        if (jobSalaryMatch) {
          const jobMinSalary = parseInt(jobSalaryMatch[0]) * 1000;
          scores.salary_match_score = jobMinSalary >= minSalary ? 1 : 
            jobMinSalary / minSalary;
        }
      }

      // Calculate overall match score
      const matchScore = Math.round(
        (scores.skill_match_score * 0.4 +
        scores.location_match_score * 0.25 +
        scores.company_match_score * 0.2 +
        scores.salary_match_score * 0.15) * 100
      );

      return {
        user_id: userId,
        job_id: job.id,
        match_score: matchScore,
        ...scores,
        is_shown: false
      };
    });

    const jobMatches = await Promise.all(matchPromises);

    // Insert job matches
    const { error: matchError } = await supabase
      .from('job_matches')
      .insert(jobMatches);

    if (matchError) throw matchError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Resume parsed and job matches generated successfully",
        data: parsedData 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

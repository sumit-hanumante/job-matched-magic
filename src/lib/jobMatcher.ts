
import { supabase } from "@/lib/supabase";
import { Job, Resume, JobMatch } from "@/lib/types";

/**
 * Calculate overall match score between a resume and a job
 * @param resume The candidate's resume
 * @param job The job to match against
 * @returns A number between 0-100 representing the match percentage
 */
export function calculateMatchScore(resume: Resume, job: Job): number {
  // Default weights for different matching aspects
  const weights = {
    skills: 0.5,      // 50% weight to skills match
    location: 0.2,    // 20% weight to location match
    company: 0.1,     // 10% weight to company preference
    salary: 0.2       // 20% weight to salary match
  };

  // Calculate individual component scores
  const skillMatchScore = calculateSkillMatchScore(resume.skills, job.description, job.requirements);
  const locationMatchScore = calculateLocationMatchScore(resume.preferred_locations, job.location);
  const companyMatchScore = calculateCompanyMatchScore(resume.preferred_companies, job.company);
  const salaryMatchScore = calculateSalaryMatchScore(resume.min_salary, resume.max_salary, job);

  // Calculate weighted average
  const overallScore = (
    (skillMatchScore * weights.skills) +
    (locationMatchScore * weights.location) +
    (companyMatchScore * weights.company) +
    (salaryMatchScore * weights.salary)
  ) * 100;

  return Math.round(overallScore);
}

/**
 * Calculate skill match score between resume skills and job description/requirements
 * @returns A number between 0-1
 */
function calculateSkillMatchScore(
  resumeSkills: string[] = [], 
  jobDescription: string = "", 
  jobRequirements: string[] = []
): number {
  if (!resumeSkills || resumeSkills.length === 0) return 0;
  
  // Convert to lowercase for case-insensitive matching
  const lowerCaseSkills = resumeSkills.map(skill => skill.toLowerCase());
  const lowerCaseDesc = jobDescription.toLowerCase();
  const lowerCaseReqs = jobRequirements?.map(req => req.toLowerCase()) || [];
  
  // Count how many skills from the resume appear in the job description or requirements
  let matchCount = 0;
  for (const skill of lowerCaseSkills) {
    if (lowerCaseDesc.includes(skill) || 
        lowerCaseReqs.some(req => req.includes(skill))) {
      matchCount++;
    }
  }
  
  return matchCount / Math.max(resumeSkills.length, 1);
}

/**
 * Calculate location match score
 * @returns A number between 0-1
 */
function calculateLocationMatchScore(
  preferredLocations: string[] = [], 
  jobLocation: string = ""
): number {
  if (!preferredLocations || preferredLocations.length === 0 || !jobLocation) return 0.5; // Neutral score if no preferences
  
  const lowerCaseJobLocation = jobLocation.toLowerCase();
  
  // Check if 'remote' is in preferred locations and if job mentions remote
  const remotePreferred = preferredLocations.some(loc => loc.toLowerCase() === 'remote');
  const jobIsRemote = lowerCaseJobLocation.includes('remote');
  
  if (remotePreferred && jobIsRemote) return 1.0;
  
  // Check if any preferred location is mentioned in the job location
  for (const location of preferredLocations) {
    if (lowerCaseJobLocation.includes(location.toLowerCase())) {
      return 1.0;
    }
  }
  
  return 0.1; // Low match if no location preference matches
}

/**
 * Calculate company preference match score
 * @returns A number between 0-1
 */
function calculateCompanyMatchScore(
  preferredCompanies: string[] = [], 
  jobCompany: string = ""
): number {
  if (!preferredCompanies || preferredCompanies.length === 0 || !jobCompany) return 0.5; // Neutral score if no preferences
  
  const lowerCaseJobCompany = jobCompany.toLowerCase();
  
  // Check if any preferred company matches the job company
  for (const company of preferredCompanies) {
    if (lowerCaseJobCompany.includes(company.toLowerCase())) {
      return 1.0;
    }
  }
  
  return 0.3; // Moderate mismatch if company isn't in preferences
}

/**
 * Calculate salary match score
 * @returns A number between 0-1
 */
function calculateSalaryMatchScore(
  minSalary?: number, 
  maxSalary?: number, 
  job?: Job
): number {
  if (!minSalary || !job?.salaryRange) return 0.5; // Neutral score if no salary info
  
  // Try to extract numbers from salary range string
  let jobMinSalary = 0;
  let jobMaxSalary = 0;
  
  try {
    // Extract numbers from strings like "$50,000 - $80,000"
    const numbers = job.salaryRange.match(/\d[\d,\.]*\d|\d/g);
    if (numbers && numbers.length >= 2) {
      jobMinSalary = parseInt(numbers[0].replace(/[^\d]/g, ''));
      jobMaxSalary = parseInt(numbers[1].replace(/[^\d]/g, ''));
    } else if (numbers && numbers.length === 1) {
      // Handle single number salary like "$50,000"
      jobMinSalary = parseInt(numbers[0].replace(/[^\d]/g, ''));
      jobMaxSalary = jobMinSalary;
    }
  } catch (e) {
    console.error("Error parsing salary:", e);
    return 0.5;
  }
  
  if (jobMinSalary === 0) return 0.5;
  
  // Logic for salary matching
  if (maxSalary && maxSalary < jobMinSalary) {
    // Job pays more than candidate's max expectation
    return 0.7; // Good match but might be overqualified
  } else if (minSalary > jobMaxSalary) {
    // Job pays less than candidate's minimum
    return 0.2; // Poor match
  } else {
    // Overlap in salary ranges - perfect match
    return 1.0;
  }
}

/**
 * Fetch top job matches for a candidate using vector search.
 * @param candidateEmbedding - The candidate's embedding vector.
 * @returns An array of job matches with job id, title, and similarity distance.
 */
export async function getJobMatches(candidateEmbedding: number[]): Promise<any[]> {
  try {
    // Call the stored procedure "match_jobs" using supabase.rpc
    const { data, error } = await supabase.rpc("match_jobs", { candidate_vector: candidateEmbedding });
    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }
    console.log("Vector job matches retrieved:", data);
    return data as any[];
  } catch (error) {
    console.error("Error fetching vector job matches:", error);
    throw error;
  }
}

/**
 * Fetch jobs and calculate match scores based on candidate's resume
 */
export async function matchJobsToResume(resumeId: string): Promise<JobMatch[]> {
  try {
    // 1. Fetch the resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();
    
    if (resumeError) throw new Error(`Resume fetch error: ${resumeError.message}`);
    if (!resume) throw new Error('Resume not found');
    
    // 2. Fetch jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .order('posted_date', { ascending: false })
      .limit(50);
    
    if (jobsError) throw new Error(`Jobs fetch error: ${jobsError.message}`);
    if (!jobs || jobs.length === 0) return [];
    
    // 3. Calculate match scores
    const matches: JobMatch[] = jobs.map(job => {
      const matchScore = calculateMatchScore(resume, job);
      const skillMatchScore = calculateSkillMatchScore(resume.extracted_skills, job.description, job.requirements);
      const locationMatchScore = calculateLocationMatchScore(resume.preferred_locations, job.location);
      const companyMatchScore = calculateCompanyMatchScore(resume.preferred_companies, job.company);
      const salaryMatchScore = calculateSalaryMatchScore(resume.min_salary, resume.max_salary, job);
      
      return {
        id: crypto.randomUUID(),
        userId: resume.user_id,
        jobId: job.id,
        matchScore,
        createdAt: new Date().toISOString(),
        isShown: false,
        skillMatchScore: skillMatchScore * 100,
        locationMatchScore: locationMatchScore * 100,
        companyMatchScore: companyMatchScore * 100,
        salaryMatchScore: salaryMatchScore * 100
      };
    });
    
    // 4. Sort by match score (highest first)
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches;
  } catch (error) {
    console.error('Error in matchJobsToResume:', error);
    throw error;
  }
}

/**
 * Store job matches in the database
 */
export async function saveJobMatches(matches: JobMatch[]): Promise<void> {
  try {
    if (!matches || matches.length === 0) return;
    
    const { error } = await supabase
      .from('job_matches')
      .insert(matches.map(match => ({
        id: match.id,
        user_id: match.userId,
        job_id: match.jobId,
        match_score: match.matchScore,
        skill_match_score: match.skillMatchScore,
        location_match_score: match.locationMatchScore,
        company_match_score: match.companyMatchScore,
        salary_match_score: match.salaryMatchScore,
        is_shown: match.isShown,
        created_at: match.createdAt
      })));
    
    if (error) throw error;
    
    console.log(`Saved ${matches.length} job matches to database`);
  } catch (error) {
    console.error('Error saving job matches:', error);
    throw error;
  }
}

/**
 * Get job matches for a user from the database
 */
export async function getUserJobMatches(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('job_matches')
      .select(`
        *,
        jobs:job_id (*)
      `)
      .eq('user_id', userId)
      .order('match_score', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user job matches:', error);
    throw error;
  }
}

/**
 * Process job matching for a user's resume
 * This is the main function that ties everything together
 */
export async function processJobMatching(resumeId: string): Promise<void> {
  try {
    console.log(`Starting job matching process for resume ${resumeId}`);
    
    // 1. Match jobs to resume
    const matches = await matchJobsToResume(resumeId);
    console.log(`Generated ${matches.length} job matches`);
    
    // 2. Save matches to database
    if (matches.length > 0) {
      await saveJobMatches(matches);
      console.log('Job matches saved successfully');
    }
    
    // 3. Return success
    return;
  } catch (error) {
    console.error('Error in job matching process:', error);
    throw error;
  }
}

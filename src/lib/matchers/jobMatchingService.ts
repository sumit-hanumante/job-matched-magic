
import { supabase } from "@/lib/supabase";
import { Job, Resume, JobMatch } from "@/lib/types";
import { calculateMatchScore, calculateSkillMatchScore, calculateLocationMatchScore, 
  calculateCompanyMatchScore, calculateSalaryMatchScore } from "./calculateMatchers";

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
    
    // First fetch existing job matches for this user to avoid duplicates
    const userIds = [...new Set(matches.map(match => match.userId))];
    const jobIds = [...new Set(matches.map(match => match.jobId))];
    
    if (userIds.length === 0 || jobIds.length === 0) return;
    
    const { data: existingMatches } = await supabase
      .from('job_matches')
      .select('job_id, user_id')
      .in('user_id', userIds)
      .in('job_id', jobIds);
    
    // Create a lookup set for quick checking
    const existingPairs = new Set();
    if (existingMatches && existingMatches.length > 0) {
      existingMatches.forEach(match => {
        existingPairs.add(`${match.user_id}_${match.job_id}`);
      });
    }
    
    // Filter out matches that already exist
    const newMatches = matches.filter(match => 
      !existingPairs.has(`${match.userId}_${match.jobId}`)
    );
    
    console.log(`Found ${existingMatches?.length || 0} existing matches, inserting ${newMatches.length} new matches`);
    
    if (newMatches.length === 0) {
      console.log('No new matches to insert');
      return;
    }
    
    const { error } = await supabase
      .from('job_matches')
      .insert(newMatches.map(match => ({
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
    
    if (error) {
      console.error('Error details:', error);
      throw error;
    }
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
    // 1. Match jobs to resume
    const matches = await matchJobsToResume(resumeId);
    
    // 2. Save matches to database
    if (matches.length > 0) {
      await saveJobMatches(matches);
    }
  } catch (error) {
    console.error('Error in job matching process:', error);
    throw error;
  }
}

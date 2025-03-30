
import { Job, Resume } from "@/lib/types";

/**
 * Calculate skill match score between resume skills and job description/requirements
 * @returns A number between 0-1
 */
export function calculateSkillMatchScore(
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
export function calculateLocationMatchScore(
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
export function calculateCompanyMatchScore(
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
export function calculateSalaryMatchScore(
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

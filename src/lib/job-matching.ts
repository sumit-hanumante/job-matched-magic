
import { Job, Resume } from "./types";

interface MatchScores {
  skillMatchScore: number;
  locationMatchScore: number;
  companyMatchScore: number;
  salaryMatchScore: number;
}

// Calculate similarity between two strings
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  return s1.includes(s2) || s2.includes(s1) ? 1 : 0;
}

// Calculate similarity between arrays of strings
function arrayStringSimilarity(arr1: string[], arr2: string[]): number {
  if (!arr1.length || !arr2.length) return 0;
  let matches = 0;
  arr1.forEach(item1 => {
    arr2.forEach(item2 => {
      if (stringSimilarity(item1, item2) > 0) matches++;
    });
  });
  return matches / Math.max(arr1.length, arr2.length);
}

// Extract salary range as numbers
function extractSalaryRange(salaryStr: string): { min: number; max: number } | null {
  if (!salaryStr) return null;
  
  // Remove currency symbols and convert to lowercase
  const cleaned = salaryStr.toLowerCase().replace(/[$,]/g, '');
  
  // Try to find numbers in the string
  const numbers = cleaned.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;
  
  // Convert found numbers to actual numbers
  const salaryNumbers = numbers.map(n => parseInt(n));
  
  // If we have two numbers, assume it's a range
  if (salaryNumbers.length >= 2) {
    return {
      min: Math.min(salaryNumbers[0], salaryNumbers[1]),
      max: Math.max(salaryNumbers[0], salaryNumbers[1])
    };
  }
  
  // If we have one number, use it as both min and max
  return {
    min: salaryNumbers[0],
    max: salaryNumbers[0]
  };
}

// Calculate match scores between a job and a resume
export function calculateMatchScores(job: Job, resume: Resume): MatchScores {
  // Skills matching
  const skillMatchScore = resume.skills ? 
    arrayStringSimilarity(
      resume.skills,
      [
        job.title.split(' '),
        ...(job.requirements || []),
        ...job.description.split(' ')
      ].flat()
    ) : 0;

  // Location matching (if preferred locations specified)
  const locationMatchScore = resume.preferred_locations?.length ?
    Math.max(...resume.preferred_locations.map(loc => 
      stringSimilarity(loc, job.location)
    )) : 1; // If no preferences, don't penalize

  // Company matching (if preferred companies specified)
  const companyMatchScore = resume.preferred_companies?.length ?
    Math.max(...resume.preferred_companies.map(comp => 
      stringSimilarity(comp, job.company)
    )) : 1; // If no preferences, don't penalize

  // Salary matching
  let salaryMatchScore = 1;
  if (resume.min_salary && job.salaryRange) {
    const jobSalary = extractSalaryRange(job.salaryRange);
    if (jobSalary) {
      // If job salary is below minimum expected, reduce score
      salaryMatchScore = jobSalary.max >= resume.min_salary ? 1 : 
        jobSalary.max / resume.min_salary;
    }
  }

  return {
    skillMatchScore,
    locationMatchScore,
    companyMatchScore,
    salaryMatchScore
  };
}

// Calculate overall match percentage
export function calculateOverallMatch(scores: MatchScores): number {
  // Weights for different factors (can be adjusted)
  const weights = {
    skills: 0.4,
    location: 0.25,
    company: 0.2,
    salary: 0.15
  };

  const weightedScore = 
    (scores.skillMatchScore * weights.skills) +
    (scores.locationMatchScore * weights.location) +
    (scores.companyMatchScore * weights.company) +
    (scores.salaryMatchScore * weights.salary);

  // Convert to percentage and round to nearest integer
  return Math.round(weightedScore * 100);
}

// Get daily job recommendations
export async function getDailyJobRecommendations(
  jobs: Job[],
  resume: Resume,
  maxJobs: number = 10
): Promise<Job[]> {
  if (!jobs.length || !resume) return [];

  // Calculate match scores for all jobs
  const jobsWithScores = jobs.map(job => {
    const scores = calculateMatchScores(job, resume);
    const matchScore = calculateOverallMatch(scores);
    return {
      ...job,
      matchScore,
      scores
    };
  });

  // Sort by match score (highest first)
  const sortedJobs = jobsWithScores.sort((a, b) => b.matchScore - a.matchScore);

  // Return top N jobs
  return sortedJobs.slice(0, maxJobs);
}

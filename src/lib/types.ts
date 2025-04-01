
// Add this console.log to see when types are loaded
console.log("Loading types.ts module");

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  matchScore: number;
  postedDate: string;
  requirements?: string[];
  salaryRange?: string;
  lastScrapedAt?: string;
  source: string;
}

// Log the Job interface structure to help debug
console.log("Job interface properties:", Object.keys({
  id: "",
  title: "",
  company: "",
  location: "",
  description: "", 
  applyUrl: "",
  matchScore: 0,
  postedDate: "",
  requirements: [],
  salaryRange: "",
  lastScrapedAt: "",
  source: ""
}));

export interface Resume {
  id: string;
  userId: string;
  skills: string[];
  experience: string;
  education?: string;
  projects?: string;
  personal_information?: string;
  summary?: string;
  salary?: string;
  preferred_locations?: string[];
  preferred_companies?: string[];
  min_salary?: number;
  max_salary?: number;
  preferred_work_type?: string;
  years_of_experience?: number;
  possible_job_titles?: string[];
}

export interface JobMatch {
  id: string;
  userId: string;
  jobId: string;
  matchScore: number;
  createdAt: string;
  viewedAt?: string;
  isShown: boolean;
  skillMatchScore: number;
  locationMatchScore: number;
  companyMatchScore: number;
  salaryMatchScore: number;
}

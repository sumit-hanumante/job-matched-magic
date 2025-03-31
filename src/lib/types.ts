
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

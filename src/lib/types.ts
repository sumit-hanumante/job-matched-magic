
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
  salary?: string;
}

export interface JobMatch {
  id: string;
  userId: string;
  jobId: string;
  matchScore: number;
  createdAt: string;
}

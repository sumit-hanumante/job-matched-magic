
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
}

export interface ParsedResumeData {
  skills: string[];
  experience: string;
  salary?: string;
  location?: string;
  education: string[];
  jobTitle: string;
  industries: string[];
  languages: string[];
  certifications: string[];
  preferredWorkType?: 'remote' | 'hybrid' | 'onsite';
  availability?: string;
  achievements: string[];
}

export interface Resume {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  uploadDate: string;
  extractedSkills?: string[];
  parsed_data?: ParsedResumeData;
  status: 'pending' | 'processed' | 'error';
}

export interface JobMatch {
  id: string;
  userId: string;
  jobId: string;
  matchScore: number;
  createdAt: string;
}


export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  applyUrl: string;
  matchScore: number;
  postedDate: string;
}

export interface Resume {
  id: string;
  fileName: string;
  uploadDate: string;
  skills: string[];
  experience: {
    title: string;
    company: string;
    duration: string;
  }[];
}

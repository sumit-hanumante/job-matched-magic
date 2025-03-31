
// Type definitions for the parse-resume function
export interface ResumeParseRequest {
  resumeText?: string;
  test?: boolean;
}

export interface PersonalInformation {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
}

export interface ParsedResumeData {
  personal_information?: PersonalInformation;
  summary?: string;
  extracted_skills?: string[];
  experience?: any;
  education?: any;
  projects?: any;
  preferred_locations?: string[];
  preferred_companies?: string[];
  min_salary?: number | null;
  max_salary?: number | null;
  preferred_work_type?: string | null;
  years_of_experience?: number | null;
  possible_job_titles?: string[];
  resume_text?: string;
}

export interface ParsedResumeResponse {
  success: boolean;
  data?: ParsedResumeData;
  error?: string;
  errorType?: string;
  processingTime?: number;
}

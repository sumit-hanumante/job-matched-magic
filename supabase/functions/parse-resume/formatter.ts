
import { ParsedResumeData } from "./types.ts";

// Format the parsed data with reasonable defaults
export function formatParsedData(parsedData: any, resumeText: string): ParsedResumeData {
  // Ensure parsedData is an object
  const data = parsedData || {};
  
  return {
    summary: data.summary || "",
    extracted_skills: Array.isArray(data.extracted_skills) ? data.extracted_skills : [],
    experience: data.experience || "",
    education: data.education || "",
    projects: data.projects || "",
    preferred_locations: Array.isArray(data.preferred_locations) ? data.preferred_locations : [],
    preferred_companies: Array.isArray(data.preferred_companies) ? data.preferred_companies : [],
    min_salary: data.min_salary || null,
    max_salary: data.max_salary || null,
    preferred_work_type: data.preferred_work_type || null,
    years_of_experience: data.years_of_experience || null,
    possible_job_titles: Array.isArray(data.possible_job_titles) ? data.possible_job_titles : [],
    personal_information: data.personal_information || {},
    resume_text: resumeText || ""
  };
}


import { ParsedResumeData } from "./types.ts";

// Format the parsed data with reasonable defaults
export function formatParsedData(parsedData: any, resumeText: string): ParsedResumeData {
  return {
    summary: parsedData.summary || "",
    extracted_skills: Array.isArray(parsedData.extracted_skills) ? parsedData.extracted_skills : [],
    experience: parsedData.experience || "",
    education: parsedData.education || "",
    projects: parsedData.projects || "",
    preferred_locations: Array.isArray(parsedData.preferred_locations) ? parsedData.preferred_locations : [],
    preferred_companies: Array.isArray(parsedData.preferred_companies) ? parsedData.preferred_companies : [],
    min_salary: parsedData.min_salary || null,
    max_salary: parsedData.max_salary || null,
    preferred_work_type: parsedData.preferred_work_type || null,
    years_of_experience: parsedData.years_of_experience || null,
    possible_job_titles: Array.isArray(parsedData.possible_job_titles) ? parsedData.possible_job_titles : [],
    personal_information: parsedData.personal_information || {},
    resume_text: resumeText
  };
}

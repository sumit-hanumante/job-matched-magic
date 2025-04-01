
import { ParsedResumeData } from "./types.ts";

// Format the parsed data with reasonable defaults
export function formatParsedData(parsedData: any, resumeText: string): ParsedResumeData {
  // Ensure parsedData is an object
  const data = parsedData || {};
  
  // Log the incoming data to help debug issues
  console.log("Formatting parsed data with keys:", Object.keys(data));
  
  // Handle specific cases where data might not be in the expected format
  let extractedSkills = [];
  if (data.extracted_skills) {
    if (Array.isArray(data.extracted_skills)) {
      extractedSkills = data.extracted_skills;
    } else if (typeof data.extracted_skills === 'string') {
      // Try to parse if it's a string that might be JSON
      try {
        const parsed = JSON.parse(data.extracted_skills);
        extractedSkills = Array.isArray(parsed) ? parsed : [data.extracted_skills];
      } catch (e) {
        extractedSkills = [data.extracted_skills];
      }
    }
  }
  
  // Process array fields consistently
  const processArrayField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [field];
      } catch (e) {
        return [field];
      }
    }
    return [];
  };
  
  return {
    summary: data.summary || "",
    extracted_skills: extractedSkills,
    experience: data.experience || "",
    education: data.education || "",
    projects: data.projects || "",
    preferred_locations: processArrayField(data.preferred_locations),
    preferred_companies: processArrayField(data.preferred_companies),
    min_salary: data.min_salary !== undefined ? data.min_salary : null,
    max_salary: data.max_salary !== undefined ? data.max_salary : null,
    preferred_work_type: data.preferred_work_type || null,
    years_of_experience: data.years_of_experience !== undefined ? data.years_of_experience : null,
    possible_job_titles: processArrayField(data.possible_job_titles),
    personal_information: data.personal_information || {},
    resume_text: resumeText || ""
  };
}

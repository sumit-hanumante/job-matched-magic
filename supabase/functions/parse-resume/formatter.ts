
import { ParsedResumeData } from "./types.ts";

// Format the parsed data with reasonable defaults
export function formatParsedData(parsedData: any, resumeText: string): ParsedResumeData {
  // Ensure parsedData is an object
  const data = parsedData || {};
  
  // Log the incoming data to help debug issues
  console.log("Formatting parsed data with keys:", Object.keys(data));
  
  // Handle specific cases where data might not be in the expected format
  let extractedSkills: string[] = [];
  
  // Enhanced extraction of skills from different formats
  if (data.extracted_skills) {
    console.log("Processing extracted_skills of type:", typeof data.extracted_skills);
    
    if (Array.isArray(data.extracted_skills)) {
      // Already an array, ensure all items are strings
      extractedSkills = data.extracted_skills.map((skill: any) => String(skill));
      console.log("Skills already in array format, ensuring all are strings");
    } else if (typeof data.extracted_skills === 'string') {
      console.log("Skills in string format, attempting to parse...");
      
      // Check if it's a comma-separated list
      if (data.extracted_skills.includes(',')) {
        extractedSkills = data.extracted_skills.split(',').map((skill: string) => skill.trim());
        console.log("Parsed comma-separated skills string into array");
      } else {
        // Try to parse as JSON if it's not a simple comma-separated list
        try {
          const parsed = JSON.parse(data.extracted_skills);
          extractedSkills = Array.isArray(parsed) ? parsed.map(String) : [String(data.extracted_skills)];
          console.log("Successfully parsed skills JSON string");
        } catch (e) {
          // If parsing fails, treat as a single skill
          extractedSkills = [String(data.extracted_skills)];
          console.log("Using skills string as a single skill");
        }
      }
    } else if (typeof data.extracted_skills === 'object') {
      // Handle cases where it might be an object but not an array
      extractedSkills = Object.values(data.extracted_skills).map(String);
      console.log("Converted object to skills array");
    }
    
    // Remove any empty skills
    extractedSkills = extractedSkills.filter(skill => skill && skill.trim() !== '');
    console.log(`Final skills array has ${extractedSkills.length} items`);
    
    // Log sample of skills for debugging
    if (extractedSkills.length > 0) {
      console.log("Sample skills:", extractedSkills.slice(0, 5));
    }
  }
  
  // Fallback for empty skills
  if (extractedSkills.length === 0) {
    console.warn("No skills extracted, using fallback extraction");
    
    // Simple keyword-based fallback extraction
    const techKeywords = [
      "JavaScript", "TypeScript", "Python", "Java", "C#", "Ruby", "PHP", "React", 
      "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", "ASP.NET",
      "SQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", "AWS", "Azure", "GCP", 
      "Docker", "Kubernetes", "CI/CD", "Git", "REST API", "GraphQL"
    ];
    
    // Simple fallback: check if any tech keywords appear in the resume text
    extractedSkills = techKeywords.filter(keyword => 
      resumeText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    console.log(`Fallback extraction found ${extractedSkills.length} potential skills`);
    if (extractedSkills.length > 0) {
      console.log("Fallback extracted skills:", extractedSkills);
    }
  }
  
  // Process array fields consistently
  const processArrayField = (field: any): string[] => {
    if (!field) return [];
    if (Array.isArray(field)) return field.map(String);
    if (typeof field === 'string') {
      if (field.includes(',')) {
        return field.split(',').map(item => item.trim());
      }
      
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed.map(String) : [String(field)];
      } catch (e) {
        return [String(field)];
      }
    }
    return [];
  };
  
  // Make sure to explicitly cast all string arrays
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

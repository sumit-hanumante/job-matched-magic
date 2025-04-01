
// Prompt template for resume parsing
export function buildResumeParsingPrompt(resumeText: string): string {
  return `
    Analyze this resume and extract details in JSON format optimized for job matching:
    
    Return a JSON with these keys:
    - personal_information (name, email, phone, location)
    - summary (brief candidate overview)
    - extracted_skills (array of technical skills, soft skills, tools)
    - experience (work history with company, role, dates, responsibilities)
    - education (degrees, institutions, dates)
    - projects (name, description, tech stack used)
    - preferred_locations (array of locations preferred)
    - preferred_companies (array of company names the candidate has mentioned interest in)
    - min_salary (minimum salary as number without currency symbols)
    - max_salary (maximum salary as number without currency symbols)
    - preferred_work_type (remote, hybrid, on-site)
    - years_of_experience (total years of experience as number)
    - possible_job_titles (suitable job titles based on skills/experience)
    
    Keep skills as a clean array of strings. Salary values should be numeric only.
    
    Resume text:
    ${resumeText}
  `;
}

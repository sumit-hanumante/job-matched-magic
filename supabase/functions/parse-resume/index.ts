
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.22.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----- parse-resume function: START -----");

  try {
    // 1. Read and parse request body
    const rawBody = await req.text();
    console.log(`Raw request body received, length: ${rawBody.length}`);
    console.log(`First 100 chars: ${rawBody.substring(0, 100)}...`);
    
    if (!rawBody || rawBody.length === 0) {
      throw new Error("Request body is empty");
    }

    // Parse JSON expecting 'resumeText'
    let { resumeText, test } = JSON.parse(rawBody);
    console.log(`Request body format => ${test ? ' test' : ' resumeText'}`);
    
    // Handle test requests
    if (test === true) {
      console.log("Received test request, returning success");
      return new Response(
        JSON.stringify({ success: true, message: "Edge function is working properly" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!resumeText) {
      throw new Error("No resume text provided in the request body");
    }
    
    console.log(`Parsed resumeText length: ${resumeText.length}`);
    
    // 2. Get the API key and validate it
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is missing! Setting up edge function secrets is required.");
      return new Response(
        JSON.stringify({
          success: false,
          error: "GEMINI_API_KEY is not configured. Please contact the administrator.",
          errorType: "MissingAPIKey"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 3. Build the prompt for resume parsing
    const prompt = `
      Analyze the following resume text and extract the candidate's details in a format optimized for job matching.
      
      Return a JSON object with these keys:
      - personal_information (name, email, phone, location)
      - summary (a brief overview of the candidate)
      - extracted_skills (an array of technical skills, soft skills, and tools the candidate knows)
      - experience (detailed work history with company, role, dates, and responsibilities)
      - education (degrees, institutions, dates)
      - projects (name, description, technologies used)
      - preferred_locations (array of locations the candidate prefers to work in, extract from their current location and any mentioned preferences)
      - preferred_companies (array of company names the candidate has mentioned interest in)
      - min_salary (extract minimum expected salary if mentioned, as a number without currency symbols)
      - max_salary (extract maximum expected salary if mentioned, as a number without currency symbols)
      - preferred_work_type (remote, hybrid, on-site, etc.)
      - years_of_experience (total years of professional experience as a number)
      - possible_job_titles (array of job titles that would be suitable for this candidate based on their skills and experience)
      
      Format the skills as a clean array of strings, not nested objects, to enable easier matching with job requirements.
      Make sure salary values are numeric only (no currency symbols or text).
      For possible_job_titles, include both current and potential roles they could apply for based on their skills and experience.
      
      Resume text:
      ${resumeText}
    `;

    // 4. Direct API call to Gemini using fetch (similar to your working curl command)
    console.log("Making direct API call to Gemini...");
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorText}`);
        throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("Received response from Gemini API");
      
      if (!responseData.candidates || responseData.candidates.length === 0) {
        console.error("No candidates in Gemini response:", responseData);
        throw new Error("No content in Gemini API response");
      }
      
      // Extract the text from the response
      const candidateContent = responseData.candidates[0].content;
      if (!candidateContent || !candidateContent.parts || candidateContent.parts.length === 0) {
        console.error("Unexpected Gemini response format:", responseData);
        throw new Error("Unexpected Gemini response format");
      }
      
      const rawText = candidateContent.parts[0].text;
      console.log(`Raw text response length: ${rawText.length}`);
      
      // 5. Parse the JSON from the response
      let parsedData;
      try {
        // Find JSON in the text (in case the model wrapped it with markdown)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : rawText;
        
        parsedData = JSON.parse(jsonString);
        console.log("Successfully parsed JSON response");
        
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON:", parseErr);
        console.error("Raw text response:", rawText);
        throw new Error("Failed to parse AI response as valid JSON");
      }
      
      // 6. Format the data with defaults if fields are missing
      const formattedData = {
        personal_information: parsedData.personal_information || {},
        summary: parsedData.summary || "",
        extracted_skills: Array.isArray(parsedData.extracted_skills) ? parsedData.extracted_skills : [],
        experience: parsedData.experience || "",
        education: Array.isArray(parsedData.education) ? parsedData.education : [],
        projects: Array.isArray(parsedData.projects) ? parsedData.projects : [],
        preferred_locations: Array.isArray(parsedData.preferred_locations) ? parsedData.preferred_locations : [],
        preferred_companies: Array.isArray(parsedData.preferred_companies) ? parsedData.preferred_companies : [],
        min_salary: parsedData.min_salary || null,
        max_salary: parsedData.max_salary || null,
        preferred_work_type: parsedData.preferred_work_type || null,
        years_of_experience: parsedData.years_of_experience || null,
        possible_job_titles: Array.isArray(parsedData.possible_job_titles) ? parsedData.possible_job_titles : [],
        resume_text: resumeText
      };
      
      console.log("Successfully formatted data, returning response");
      
      // 7. Return the structured data
      return new Response(
        JSON.stringify({
          success: true,
          data: formattedData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);
      console.error("Error details:", apiError.stack || "No stack trace available");
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI processing error: ${apiError.message || "Unknown error"}`,
          errorType: "AIProcessingError"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in parse-resume:", error);
    console.error("Error stack:", error.stack || "No stack trace available");
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process request",
        errorType: error.name || "Unknown",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    console.log("----- parse-resume function: END -----");
  }
});

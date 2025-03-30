
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.22.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", // Removed x-app-version
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----- parse-resume function: START -----");

  try {
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers), null, 2));

    // 1. Read the raw request body
    const rawBody = await req.text();
    console.log("Raw request body length =>", rawBody.length);
    
    // Additional validation for empty body
    if (!rawBody || rawBody.length === 0) {
      console.error("Empty request body received");
      throw new Error("Request body is empty");
    }

    // 2. Parse JSON expecting 'resumeText'
    let resumeText;
    try {
      const body = JSON.parse(rawBody);
      console.log("Request body format => ", Object.keys(body).join(', '));
      
      resumeText = body.resumeText;
      
      // Handle case where resumeUrl might be sent instead
      if (!resumeText && body.resumeUrl) {
        console.log("No resumeText found but resumeUrl was provided. This is not supported anymore.");
        console.log("URL provided:", body.resumeUrl);
        throw new Error("Direct text extraction is required. URL-based extraction is no longer supported.");
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw body:", rawBody.substring(0, 500) + "..."); // Log first 500 chars for debugging
      throw new Error(`Failed to parse request JSON: ${parseError.message}`);
    }
    
    if (!resumeText) {
      throw new Error("No resume text provided in the request body");
    }
    
    console.log("Parsed resumeText length =>", resumeText.length);
    console.log("First 200 chars of resumeText =>", resumeText.substring(0, 200));

    // 3. Initialize Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    console.log("Gemini API Key present:", !!geminiApiKey);
    
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is missing! Setting up edge function secrets is required.");
      // Instead of throwing, return a less processed response
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            resume_text: resumeText, // Just return the raw text
          },
          message: "GEMINI_API_KEY is missing, saving raw text only."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 4. Build the prompt using the extracted resume text - UPDATED with new fields
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
    
    console.log("Sending prompt to Gemini (prompt length) =>", prompt.length);
    
    // 5. Call Gemini
    const result = await model.generateContent(prompt);
    const rawGeminiResponse = await result.response.text();
    console.log("Gemini raw response received, length =>", rawGeminiResponse.length);
    console.log("Gemini first 300 chars =>", rawGeminiResponse.substring(0, 300));
    
    // 6. Attempt to parse Gemini's response as JSON
    let parsedData;
    try {
      // Remove markdown code blocks if present and parse JSON
      parsedData = JSON.parse(rawGeminiResponse.replace(/```json|```/g, '').trim());
      console.log("Successfully parsed JSON response");
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", parseErr);
      console.log("Raw Gemini response:", rawGeminiResponse);
      // Create a minimal valid structure instead of throwing
      parsedData = { 
        extracted_skills: [],
        preferred_locations: [],
        preferred_companies: [],
        personal_information: {},
        summary: "Failed to parse resume automatically. Raw text saved."
      };
    }
    
    // 7. Return the processed data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...parsedData,
          resume_text: resumeText // Always include the full resume text
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-resume =>", error);
    // For actual errors, return an error response
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process request",
        errorType: error.name || "Unknown",
        errorStack: error.stack || "No stack trace available",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

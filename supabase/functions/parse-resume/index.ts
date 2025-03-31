
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
    
    if (!rawBody || rawBody.length === 0) {
      throw new Error("Request body is empty");
    }

    // Parse JSON expecting 'resumeText'
    let { resumeText, test } = JSON.parse(rawBody);
    
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
    
    // 2. Initialize Gemini API
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
    
    console.log("Initializing Gemini API");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // 3. Set up the extraction model with basic config
    const extractionModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
    // 4. Build the prompt
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
      
      Format the response as a valid JSON object.
      
      Resume text:
      ${resumeText}
    `;
    
    console.log("Sending prompt to Gemini");
    console.log("Making API call to Gemini...");
    
    try {
      // 5. Make the API call
      const result = await extractionModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      const rawGeminiResponse = await result.response.text();
      console.log(`Gemini response received, length: ${rawGeminiResponse.length}`);
      
      // 6. Parse the response
      let parsedData;
      try {
        // Clean the response if it contains markdown code blocks
        const cleanedResponse = rawGeminiResponse.replace(/```json|```/g, '').trim();
        parsedData = JSON.parse(cleanedResponse);
        console.log("Successfully parsed JSON response");
        
      } catch (parseErr) {
        console.error("Failed to parse Gemini response:", parseErr);
        console.error("Raw Gemini response:", rawGeminiResponse);
        throw new Error("Failed to parse AI response as valid JSON");
      }
      
      // 7. Format the data with defaults if fields are missing
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
      
      // 8. Return the structured data
      return new Response(
        JSON.stringify({
          success: true,
          data: formattedData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("Error calling Gemini API:", aiError);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI processing error: ${aiError.message || "Unknown error"}`,
          errorType: "AIProcessingError"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in parse-resume:", error);
    
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

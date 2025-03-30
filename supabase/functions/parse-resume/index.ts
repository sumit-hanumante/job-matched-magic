
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.22.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----- parse-resume function: START -----");

  try {
    // 1. Read the raw request body
    const rawBody = await req.text();
    console.log("Raw request body length =>", rawBody.length);

    // 2. Parse JSON expecting 'resumeText'
    const { resumeText } = JSON.parse(rawBody);
    
    if (!resumeText) {
      throw new Error("No resume text provided");
    }
    
    console.log("Parsed resumeText length =>", resumeText.length);
    console.log("First 200 chars of resumeText =>", resumeText.substring(0, 200));

    // 3. Initialize Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    console.log("Gemini API Key present:", !!geminiApiKey);
    
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 4. Build the prompt using the extracted resume text
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
      
      Format the skills as a clean array of strings, not nested objects, to enable easier matching with job requirements.
      Make sure salary values are numeric only (no currency symbols or text).
      
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
      parsedData = JSON.parse(rawGeminiResponse.replace(/```json|```/g, '').trim());
      console.log("Successfully parsed JSON response");
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", parseErr);
      parsedData = { 
        extracted_skills: [],
        preferred_locations: [],
        preferred_companies: [],
        raw_text: resumeText // Store the raw text as fallback
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
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process request",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

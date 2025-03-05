
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

  // 1. Read the raw request body
  const rawBody = await req.text();
  console.log("Raw request body =>", rawBody);

  try {
    // 2. Parse JSON expecting 'resumeText'
    const { resumeText } = JSON.parse(rawBody);
    console.log("Parsed resumeText (first 200 chars) =>", resumeText ? resumeText.substring(0, 200) + "..." : "Empty");

    if (!resumeText || resumeText.length === 0) {
      throw new Error("No resume text provided");
    }

    // 3. Initialize Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "";
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 4. Build the prompt using the extracted resume text - Enhanced for job matching
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
    console.log("Sending prompt to Gemini (first 300 chars) =>", prompt.substring(0, 300) + "...");
    
    // 5. Call Gemini
    const result = await model.generateContent(prompt);
    const rawGeminiResponse = await result.response.text();
    console.log("Gemini raw response (first 300 chars) =>", rawGeminiResponse.substring(0, 300) + "...");
    
    // 6. Attempt to parse Gemini's response as JSON
    let geminiData;
    try {
      geminiData = JSON.parse(rawGeminiResponse);
    } catch (parseErr) {
      geminiData = { raw: rawGeminiResponse };
    }
    
    // 7. Return the Gemini response
    return new Response(
      JSON.stringify({
        success: true,
        data: geminiData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in parse-resume =>", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to parse request",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

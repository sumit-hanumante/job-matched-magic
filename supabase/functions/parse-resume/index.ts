
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
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers), null, 2));

    // 1. Read the raw request body
    const rawBody = await req.text();
    console.log(`Raw request body received, length: ${rawBody.length}`);
    console.log(`First 100 chars: ${rawBody.substring(0, 100)}...`);
    
    if (!rawBody || rawBody.length === 0) {
      console.error("Empty request body received");
      throw new Error("Request body is empty");
    }

    // 2. Parse JSON expecting 'resumeText'
    let resumeText;
    try {
      const body = JSON.parse(rawBody);
      console.log("Request body format => ", Object.keys(body).join(', '));
      
      // Handle test requests
      if (body.test === true) {
        console.log("Received test request, returning success");
        return new Response(
          JSON.stringify({ success: true, message: "Edge function is working properly" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      resumeText = body.resumeText;
      
      if (!resumeText && body.resumeUrl) {
        console.log("No resumeText found but resumeUrl was provided. This is not supported anymore.");
        throw new Error("Direct text extraction is required. URL-based extraction is no longer supported.");
      }
    } catch (parseError) {
      console.error("JSON parsing error:", parseError);
      console.error("Raw body preview (first 200 chars):", rawBody.substring(0, 200) + "..."); 
      throw new Error(`Failed to parse request JSON: ${parseError.message}`);
    }
    
    if (!resumeText) {
      console.error("No resume text provided in the request body");
      throw new Error("No resume text provided in the request body");
    }
    
    console.log("Parsed resumeText length =>", resumeText.length);
    console.log("First 200 chars of resumeText =>", resumeText.substring(0, 200));

    // 3. Initialize Gemini
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    console.log("Gemini API Key present:", !!geminiApiKey);
    
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
    
    console.log("Initializing Gemini API with provided key");
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    
    // Define response schema
    const resumeSchema = {
      type: "object",
      properties: {
        personal_information: {
          type: "object",
          properties: {
            name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            location: { type: "string" }
          }
        },
        summary: { type: "string" },
        extracted_skills: { type: "array", items: { type: "string" } },
        experience: { type: "string" },
        education: { type: "array", items: { type: "string" } },
        projects: { type: "array", items: { type: "string" } },
        preferred_locations: { type: "array", items: { type: "string" } },
        preferred_companies: { type: "array", items: { type: "string" } },
        min_salary: { type: "number" },
        max_salary: { type: "number" },
        preferred_work_type: { type: "string" },
        years_of_experience: { type: "number" },
        possible_job_titles: { type: "array", items: { type: "string" } }
      }
    };
    
    // Use Gemini model for extraction with schema
    console.log("Setting up extraction model with schema");
    const extractionModel = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.2,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    });
    
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
      - years_of_experience (total years of professional experience as a number)
      - possible_job_titles (array of job titles that would be suitable for this candidate based on their skills and experience)
      
      Format the skills as a clean array of strings, not nested objects.
      Make sure salary values are numeric only (no currency symbols or text).
      
      Resume text:
      ${resumeText}
    `;
    
    console.log("Sending prompt to Gemini (prompt length) =>", prompt.length);
    console.log("====== BEFORE GEMINI API CALL ======");
    console.log("Request timestamp:", new Date().toISOString());
    console.log("Resume text length:", resumeText.length);
    console.log("Prompt first 300 chars:", prompt.substring(0, 300) + "...");
    console.log("Making API call to Gemini...");
    
    try {
      const startTime = performance.now();
      
      // Make the API call
      const result = await extractionModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      const endTime = performance.now();
      const apiCallDuration = endTime - startTime;
      
      console.log("====== AFTER GEMINI API CALL ======");
      console.log(`API call completed in ${apiCallDuration.toFixed(2)}ms`);
      
      const rawGeminiResponse = await result.response.text();
      console.log("Gemini response received");
      console.log("Response timestamp:", new Date().toISOString());
      console.log("Response length =>", rawGeminiResponse.length);
      console.log("Response first 300 chars =>", rawGeminiResponse.substring(0, 300));
      
      // 6. Attempt to parse Gemini's response as JSON
      let parsedData;
      try {
        // Remove markdown code blocks if present and parse JSON
        const cleanedResponse = rawGeminiResponse.replace(/```json|```/g, '').trim();
        console.log("Cleaned response (first 300 chars):", cleanedResponse.substring(0, 300));
        parsedData = JSON.parse(cleanedResponse);
        
        console.log("Successfully parsed JSON response");
        console.log("Extracted skills count:", parsedData.extracted_skills?.length || 0);
        console.log("Possible job titles:", parsedData.possible_job_titles?.join(', ') || 'none');
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON:", parseErr);
        console.error("Raw Gemini response:", rawGeminiResponse);
        throw new Error("Failed to parse AI response as valid JSON");
      }
      
      // Ensure all expected fields are present
      const formattedData = {
        personal_information: parsedData.personal_information || {},
        summary: parsedData.summary || "",
        extracted_skills: parsedData.extracted_skills || [],
        experience: parsedData.experience || "",
        education: parsedData.education || [],
        projects: parsedData.projects || [],
        preferred_locations: parsedData.preferred_locations || [],
        preferred_companies: parsedData.preferred_companies || [],
        min_salary: parsedData.min_salary || null,
        max_salary: parsedData.max_salary || null,
        preferred_work_type: parsedData.preferred_work_type || null,
        years_of_experience: parsedData.years_of_experience || null,
        possible_job_titles: parsedData.possible_job_titles || [],
        resume_text: resumeText // Always include the full resume text
      };
      
      console.log("Successfully formatted parsed data");
      console.log("Final response structure:", Object.keys(formattedData).join(', '));
      console.log("Sending back response with all extracted data");
      
      return new Response(
        JSON.stringify({
          success: true,
          data: formattedData
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("Error calling Gemini API:", aiError);
      console.error("Error details:", JSON.stringify(aiError, null, 2));
      
      // Return a structured error response
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI processing error: ${aiError.message || "Unknown error occurred"}`,
          errorType: aiError.name || "AIProcessingError"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in parse-resume =>", error);
    console.error("Error stack:", error.stack);
    
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
  } finally {
    console.log("----- parse-resume function: END -----");
  }
});

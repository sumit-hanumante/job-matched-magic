
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  const startTime = Date.now();

  try {
    // Debug request information
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // 1. Parse the request body
    let parsedBody;
    try {
      // Parse body as JSON - try different ways based on how it was sent
      try {
        // First try parsing directly - works if body was sent as object
        parsedBody = await req.json();
        console.log("Request body parsed successfully as direct JSON");
      } catch (directParseError) {
        // If direct parsing failed, read as text and then parse
        const rawText = await req.text();
        console.log("Raw body length:", rawText.length);
        
        if (rawText.length === 0) {
          throw new Error("Request body is empty");
        }
        
        try {
          parsedBody = JSON.parse(rawText);
          console.log("Parsed JSON from raw text successfully");
        } catch (textParseError) {
          console.error("Failed to parse raw text as JSON:", textParseError);
          throw new Error("Invalid JSON in request body");
        }
      }
      
      console.log("Body keys:", Object.keys(parsedBody));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error("Invalid or empty request body");
    }
    
    const { resumeText, test } = parsedBody;
    console.log(`Request body format => ${test ? 'test' : (resumeText ? 'resumeText' : 'unknown')}`);
    
    // Handle test requests
    if (test === true) {
      console.log("Received test request, returning success");
      return new Response(
        JSON.stringify({ success: true, message: "Edge function is working properly" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (!resumeText) {
      console.error("No resumeText provided in request body. Keys found:", Object.keys(parsedBody));
      throw new Error("No resume text provided in the request body");
    }
    
    console.log(`Parsed resumeText length: ${resumeText.length}`);
    console.log(`resumeText preview: ${resumeText.substring(0, 100)}...`);
    
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
    
    console.log("GEMINI_API_KEY found with length:", geminiApiKey.length);
    
    // 3. Build the prompt for resume parsing - 20% shorter but keeping all essential parts
    const prompt = `
      Analyze this resume and extract details in JSON format optimized for job matching:
      
      Return a JSON with these keys:
      - personal_information (name, email, phone, location)
      - summary (brief candidate overview)
      - extracted_skills (array of technical skills, soft skills, tools)
      - experience (work history with company, role, dates, responsibilities)
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

    console.log("Prepared prompt with length:", prompt.length);
    
    // 4. Direct API call to Gemini using fetch
    try {
      const apiStartTime = Date.now();
      console.log(`Using Gemini API with key starting with: ${geminiApiKey.substring(0, 4)}...`);
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      
      // Create the request payload
      const requestPayload = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      };
      
      // Log the full request details (URL and payload)
      console.log("Making API request to:", apiUrl);
      console.log("Request payload size:", JSON.stringify(requestPayload).length);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload)
      });
      
      console.log(`Gemini API response received in ${Date.now() - apiStartTime}ms`);
      console.log(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} ${response.statusText}`);
        console.error(`Error details: ${errorText}`);
        throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log("Received response from Gemini API");
      console.log("Response structure:", JSON.stringify(Object.keys(responseData)));
      
      if (!responseData.candidates || responseData.candidates.length === 0) {
        console.error("No candidates in Gemini response:", JSON.stringify(responseData));
        throw new Error("No content in Gemini API response");
      }
      
      // Extract the text from the response
      const candidateContent = responseData.candidates[0].content;
      if (!candidateContent || !candidateContent.parts || candidateContent.parts.length === 0) {
        console.error("Unexpected Gemini response format:", JSON.stringify(responseData));
        throw new Error("Unexpected Gemini response format");
      }
      
      const rawText = candidateContent.parts[0].text;
      console.log(`Raw text response length: ${rawText.length}`);
      console.log(`Response preview: ${rawText.substring(0, 150)}...`);
      
      // 5. Parse the JSON from the response
      let parsedData;
      try {
        // Find JSON in the text (in case the model wrapped it with markdown)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : rawText;
        
        console.log("Attempting to parse JSON from response...");
        parsedData = JSON.parse(jsonString);
        console.log("Successfully parsed JSON response");
        console.log("Parsed data keys:", Object.keys(parsedData));
        
      } catch (parseErr) {
        console.error("Failed to parse Gemini response as JSON:", parseErr);
        console.error("Raw text response:", rawText);
        throw new Error("Failed to parse AI response as valid JSON");
      }
      
      // 6. Format the data with defaults if fields are missing
      // Only include fields that exist in the database schema
      const formattedData = {
        personal_information: parsedData.personal_information || {},
        summary: parsedData.summary || "",
        extracted_skills: Array.isArray(parsedData.extracted_skills) ? parsedData.extracted_skills : [],
        experience: parsedData.experience || "",
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
      console.log("Skills count:", formattedData.extracted_skills.length);
      if (formattedData.extracted_skills.length > 0) {
        console.log("Sample skills:", formattedData.extracted_skills.slice(0, 5));
      }
      
      // 7. Return the structured data
      return new Response(
        JSON.stringify({
          success: true,
          data: formattedData,
          processingTime: Date.now() - startTime
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
        processingTime: Date.now() - startTime
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    console.log(`----- parse-resume function: END (took ${Date.now() - startTime}ms) -----`);
  }
});

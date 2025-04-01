
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors-headers.ts";
import { ResumeParseRequest, ParsedResumeResponse } from "./types.ts";
import { processWithAI } from "./ai-service.ts";
import { buildResumeParsingPrompt } from "./prompts.ts";
import { formatParsedData } from "./formatter.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log("Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  console.log("----- parse-resume function: START -----");
  const startTime = Date.now();

  try {
    // Debug request information
    console.log("Request method:", req.method);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // 1. Parse the request body
    let parsedBody: ResumeParseRequest;
    try {
      const requestText = await req.text();
      console.log("Raw request body length:", requestText.length);
      console.log("Request body preview (first 200 chars):", requestText.substring(0, 200));
      
      if (!requestText || requestText.trim() === "") {
        throw new Error("Empty request body");
      }
      
      try {
        parsedBody = JSON.parse(requestText);
        console.log("Parsed JSON body successfully");
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        throw new Error(`Failed to parse JSON: ${jsonError.message}`);
      }
      
      console.log("Request body parsed successfully");
      console.log("Body keys:", Object.keys(parsedBody));
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      throw new Error(`Invalid or empty request body: ${parseError.message}`);
    }
    
    const { resumeText, test } = parsedBody;
    console.log(`Request body format => ${test ? 'test' : (resumeText ? 'resumeText' : 'unknown')}`);
    
    // Handle test requests
    if (test === true) {
      console.log("Received test request, returning success");
      const response = {
        success: true,
        message: "Edge function is working properly"
      };
      
      console.log("Test response:", JSON.stringify(response));
      
      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    if (!resumeText || typeof resumeText !== 'string') {
      console.error("No resumeText provided in request body. Keys found:", Object.keys(parsedBody));
      throw new Error("No resume text provided in the request body");
    }
    
    console.log(`Parsed resumeText length: ${resumeText.length}`);
    if (resumeText.length > 0) {
      console.log(`resumeText preview: ${resumeText.substring(0, 100)}...`);
    }
    
    // 2. Get the API key and validate it
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is missing! Setting up edge function secrets is required.");
      const errorResponse = {
        success: false,
        error: "GEMINI_API_KEY is not configured. Please contact the administrator.",
        errorType: "MissingAPIKey"
      };
      
      console.log("Returning error response:", JSON.stringify(errorResponse));
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    console.log("GEMINI_API_KEY found with length:", geminiApiKey.length);
    
    // 3. Build the prompt for resume parsing
    const prompt = buildResumeParsingPrompt(resumeText);
    console.log("Prepared prompt with length:", prompt.length);
    
    // 4. Process with AI
    try {
      const apiStartTime = Date.now();
      console.log("Calling Gemini API at:", new Date().toISOString());
      const parsedData = await processWithAI(prompt, geminiApiKey);
      console.log(`Gemini API response received in ${Date.now() - apiStartTime}ms`);
      
      // Log raw API response for debugging
      console.log("Gemini raw output:", JSON.stringify(parsedData, null, 2));
      
      // Check if we have skills
      if (!parsedData.extracted_skills || 
          (Array.isArray(parsedData.extracted_skills) && parsedData.extracted_skills.length === 0)) {
        console.warn("Warning: No skills extracted from resume by Gemini API");
      } else {
        console.log("Skills extracted successfully:", 
                    typeof parsedData.extracted_skills === 'string' 
                      ? parsedData.extracted_skills.substring(0, 100) + '...'
                      : Array.isArray(parsedData.extracted_skills) 
                        ? parsedData.extracted_skills.slice(0, 5) 
                        : 'Invalid format');
      }
      
      // 5. Format the data with defaults
      const formattedData = formatParsedData(parsedData, resumeText);
      
      console.log("Successfully formatted data, preparing response");
      console.log("Skills count:", formattedData.extracted_skills?.length || 0);
      if (formattedData.extracted_skills && formattedData.extracted_skills.length > 0) {
        console.log("Sample skills:", formattedData.extracted_skills.slice(0, 5));
      }
      
      // 6. Return the structured data
      const response: ParsedResumeResponse = {
        success: true,
        data: formattedData,
        processingTime: Date.now() - startTime
      };

      console.log("Returning success response:", {
        success: true,
        processingTime: Date.now() - startTime,
        dataKeys: Object.keys(formattedData)
      });
      
      // Log complete response structure before sending
      console.log("Response headers:", JSON.stringify({ ...corsHeaders, "Content-Type": "application/json" }));
      
      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
      
    } catch (apiError) {
      console.error("Error calling Gemini API:", apiError);
      console.error("Error details:", apiError.stack || "No stack trace available");
      
      const errorResponse = {
        success: false,
        error: `AI processing error: ${apiError.message || "Unknown error"}`,
        errorType: "AIProcessingError"
      };
      
      console.log("Returning error response:", JSON.stringify(errorResponse));
      console.log("Response headers:", JSON.stringify({ ...corsHeaders, "Content-Type": "application/json" }));
      
      return new Response(
        JSON.stringify(errorResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
  } catch (error) {
    console.error("Error in parse-resume:", error);
    console.error("Error stack:", error.stack || "No stack trace available");
    
    const errorResponse = {
      success: false,
      error: error.message || "Failed to process request",
      errorType: error.name || "Unknown",
      processingTime: Date.now() - startTime
    };
    
    console.log("Returning error response:", JSON.stringify(errorResponse));
    console.log("Response headers:", JSON.stringify({ ...corsHeaders, "Content-Type": "application/json" }));
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } finally {
    console.log(`----- parse-resume function: END (took ${Date.now() - startTime}ms) -----`);
  }
});

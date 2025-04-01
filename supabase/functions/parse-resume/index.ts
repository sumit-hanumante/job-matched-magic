
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
    console.log("Request URL:", req.url);
    console.log("Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    // 1. Parse the request body
    let parsedBody: ResumeParseRequest;
    try {
      // Clone the request before reading the body to avoid consuming it
      const requestText = await req.text();
      console.log("Raw request body length:", requestText.length);
      
      if (requestText.length > 0) {
        console.log("Request body preview (first 200 chars):", requestText.substring(0, 200));
      } else {
        console.error("CRITICAL ERROR: Empty request body received");
        throw new Error("Empty request body");
      }
      
      try {
        parsedBody = JSON.parse(requestText);
        console.log("Parsed JSON body successfully");
        console.log("Body keys:", Object.keys(parsedBody));
      } catch (jsonError) {
        console.error("JSON parse error:", jsonError);
        console.error("Failed JSON content:", requestText);
        throw new Error(`Failed to parse JSON: ${jsonError.message}`);
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      console.error("Error details:", parseError.stack || "No stack available");
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
    
    // DETAILED DEBUG: Environment checks
    console.log("Environment diagnostic information:");
    console.log("Environment object type:", typeof Deno.env);
    console.log("Available environment methods:", Object.getOwnPropertyNames(Deno.env));
    
    try {
      const envKeys = Object.keys(Deno.env.toObject());
      console.log("All environment variables:", envKeys);
      console.log("Total environment variables:", envKeys.length);
      
      // Check for similar keys (case insensitive)
      const similarKeys = envKeys.filter(key => 
        key.toLowerCase().includes('gemini') || 
        key.toLowerCase().includes('api') || 
        key.toLowerCase().includes('key')
      );
      if (similarKeys.length > 0) {
        console.log("Found similar environment keys:", similarKeys);
      }
    } catch (envError) {
      console.error("Error accessing environment variables:", envError);
    }
    
    // Check API key existence
    console.log("GEMINI_API_KEY check in index.ts:");
    if (!geminiApiKey) {
      console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable is missing or empty!");
    } else {
      console.log(`GEMINI_API_KEY exists with length: ${geminiApiKey.length}`);
      console.log(`GEMINI_API_KEY first 4 chars: ${geminiApiKey.substring(0, 4)}...`);
      console.log(`GEMINI_API_KEY last 4 chars: ...${geminiApiKey.substring(geminiApiKey.length - 4)}`);
    }
    
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not configured. Please check Supabase Edge Function Secrets.");
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

      const responseJson = JSON.stringify(response);
      console.log("Returning success response:", {
        success: true,
        processingTime: Date.now() - startTime,
        responseSize: responseJson.length,
        dataKeys: Object.keys(formattedData)
      });
      
      // Log complete response structure before sending
      console.log("Response headers:", JSON.stringify({ ...corsHeaders, "Content-Type": "application/json" }));
      
      return new Response(
        responseJson,
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
    }
  finally {
    console.log(`----- parse-resume function: END (took ${Date.now() - startTime}ms) -----`);
  }
});

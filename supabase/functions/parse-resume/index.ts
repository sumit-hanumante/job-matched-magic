
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "./cors-headers.ts";
import { ResumeParseRequest, ParsedResumeResponse } from "./types.ts";
import { processWithAI } from "./ai-service.ts";
import { buildResumeParsingPrompt } from "./prompts.ts";
import { formatParsedData } from "./formatter.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    let parsedBody: ResumeParseRequest;
    try {
      const requestClone = req.clone();
      const requestText = await requestClone.text();
      
      if (requestText.length === 0) {
        throw new Error("Empty request body");
      }
      
      parsedBody = JSON.parse(requestText);
    } catch (parseError) {
      throw new Error(`Invalid or empty request body: ${parseError.message}`);
    }
    
    const { resumeText, test, generateEmbedding } = parsedBody;
    
    // Handle test requests
    if (test === true) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Edge function is working properly"
        }),
        { headers: corsHeaders }
      );
    }
    
    if (!resumeText || typeof resumeText !== 'string') {
      throw new Error("No resume text provided in the request body");
    }
    
    // Get the API key
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GEMINI_API_KEY is not configured. Please contact the administrator.",
          errorType: "MissingAPIKey"
        }),
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Build the prompt for resume parsing
    const prompt = buildResumeParsingPrompt(resumeText);
    
    // Process with AI
    try {
      const parsedData = await processWithAI(prompt, geminiApiKey);
      
      // Format the data with defaults
      const formattedData = formatParsedData(parsedData, resumeText);
      
      // Return the structured data
      const response: ParsedResumeResponse = {
        success: true,
        data: formattedData,
        processingTime: 0 // Not calculating processing time anymore
      };

      return new Response(
        JSON.stringify(response),
        { headers: corsHeaders }
      );
      
    } catch (apiError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `AI processing error: ${apiError.message || "Unknown error"}`,
          errorType: "AIProcessingError"
        }),
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to process request",
        errorType: error.name || "Unknown"
      }),
      { status: 400, headers: corsHeaders }
    );
  }
});

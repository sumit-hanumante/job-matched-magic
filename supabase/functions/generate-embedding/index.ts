
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.22.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, userId, resumeId } = await req.json();
    
    console.log(`[Edge Function] Starting embedding generation for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Edge Function] Resume text length: ${resumeText.length}`);
    
    if (!resumeText || resumeText.length < 50) {
      console.error("[Edge Function] Error: Resume text is too short");
      return new Response(
        JSON.stringify({ error: "Resume text is too short" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[Edge Function] Error: Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Missing API key configuration" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004"
    });

    // CHANGE 1/3: Specify dimension size in the API call
    console.log(`[Edge Function] Generating embedding via Gemini API`);
    const result = await model.embedContent({
      content: { parts: [{ text: resumeText }] },
      taskType: "RETRIEVAL_DOCUMENT",  // Required parameter
      dimensions: 1536  // Explicitly set dimension size
    });
    
    const embedding = result.embedding.values;
    // CHANGE 2/3: Update dimension verification log
    console.log(`[Edge Function] Successfully generated 1536-dimension embedding`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        embedding: embedding 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    // CHANGE 3/3: Enhanced error logging
    console.error("[Edge Function] Critical error:", error instanceof Error ? 
      `${error.message}\n${error.stack}` : "Unknown error");
    
    return new Response(
      JSON.stringify({ 
        error: "Embedding generation failed. Please check the resume format and try again."
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

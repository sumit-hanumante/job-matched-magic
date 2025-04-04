
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.22.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, userId, resumeId } = await req.json();
    
    // Log request details
    console.log(`[Edge Function] Starting embedding generation for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Edge Function] Resume text length: ${resumeText.length}`);
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Edge Function] Error: Resume text is too short");
      return new Response(
        JSON.stringify({ error: "Resume text is too short" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[Edge Function] Error: Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Missing API key configuration" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize AI client
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004" // Using latest embedding model
    });

    // Generate embedding
    console.log(`[Edge Function] Generating embedding via Gemini API`);
    const result = await model.embedContent(resumeText);
    const embedding = result.embedding.values;
    console.log(`[Edge Function] Successfully generated embedding with ${embedding.length} dimensions`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        embedding: embedding 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[Edge Function] Critical error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

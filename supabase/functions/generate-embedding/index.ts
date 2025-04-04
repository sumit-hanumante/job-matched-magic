
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";

// CORS headers for browser compatibility
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("[Embedding] Handling CORS preflight request");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, userId, resumeId } = await req.json();
    console.log(`[Embedding] Received request for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Embedding] Resume text (${resumeText.length} chars) is being processed`);
    console.log(`[Embedding] Resume preview: "${resumeText.substring(0, 100)}..."`);

    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding] Error: Resume text is too short");
      return new Response(
        JSON.stringify({ error: "Resume text is too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[Embedding] Error: Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Missing API key configuration" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize AI client
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004" // Latest embedding model
    });

    // Generate embedding
    console.log(`[Embedding] Starting embedding generation for user ${userId}`);
    const result = await model.embedContent(resumeText);
    const embedding = result.embedding.values;
    console.log(`[Embedding] Generated embedding with ${embedding.length} dimensions`);

    // Prepare update data
    const updateData = {
      embedding
    };

    // Update database
    const { error } = await supabase
      .from('resumes')
      .update(updateData)
      .eq(resumeId ? 'id' : 'user_id', resumeId || userId);

    if (error) {
      console.error(`[Embedding] Database update failed: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Database update failed: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Embedding] Successfully updated embedding for ${resumeId || userId}`);
    return new Response(
      JSON.stringify({ success: true, message: `Successfully updated embedding for ${resumeId || userId}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Embedding] Critical error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

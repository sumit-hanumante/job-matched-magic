
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.0";

// Set up CORS headers
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
    // Get the request body
    const { test, resumeText, userId, resumeId } = await req.json();
    
    // Get API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[Embedding Function] Error: Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // If this is just a test call to check if the API key is available
    if (test) {
      console.log("[Embedding Function] API key test successful");
      return new Response(
        JSON.stringify({ apiKeyAvailable: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding Function] Error: Resume text is too short");
      return new Response(
        JSON.stringify({ error: "Resume text is too short" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    if (!userId) {
      console.error("[Embedding Function] Error: Missing user ID");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Initialize AI client
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004" // Updated to latest embedding model
    });

    // Generate embedding
    console.log(`[Embedding Function] Starting embedding generation for user ${userId}`);
    const result = await model.embedContent(resumeText);
    const embedding = result.embedding.values;

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
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
      console.error(`[Embedding Function] Database update failed: ${error.message}`);
      return new Response(
        JSON.stringify({ error: error.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[Embedding Function] Successfully updated embedding for ${resumeId || userId}`);
    
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("[Embedding Function] Critical error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

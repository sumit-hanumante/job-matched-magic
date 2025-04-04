
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.0";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://tagvfszjeylodebvmtln.supabase.co';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[generate-embedding] Function invoked');
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[generate-embedding] Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request
    const { resumeText, userId, resumeId } = await req.json();
    console.log(`[generate-embedding] Processing request for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[generate-embedding] Resume text length: ${resumeText?.length || 0} chars`);
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[generate-embedding] Error: Resume text is too short");
      return new Response(
        JSON.stringify({ error: "Resume text is too short" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("[generate-embedding] Error: Missing GEMINI_API_KEY environment variable");
      return new Response(
        JSON.stringify({ error: "Server configuration error - missing API key" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for direct database access
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Initialize AI client
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004" // Latest embedding model
    });

    // Generate embedding
    console.log(`[generate-embedding] Starting embedding generation for user ${userId}`);
    const result = await model.embedContent(resumeText);
    const embedding = result.embedding.values;
    console.log(`[generate-embedding] Successfully generated embedding with ${embedding.length} dimensions`);

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
      console.error(`[generate-embedding] Database update failed: ${error.message}`);
      return new Response(
        JSON.stringify({ error: `Database update failed: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-embedding] Successfully updated embedding for ${resumeId || userId}`);
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("[generate-embedding] Critical error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

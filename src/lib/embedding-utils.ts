
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

export async function addResumeEmbedding(
  resumeText: string,
  userId: string,
  resumeId?: string
) {
  try {
    // Log that we're about to process the resume
    console.log(`[Embedding] Resume text (${resumeText.length} chars) is being processed for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Embedding] Resume preview: "${resumeText.substring(0, 100)}..."`);
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding] Error: Resume text is too short");
      return;
    }

    // Get API key from the correct source
    // For browser environments, we need to access environment variables differently than in Deno
    let geminiApiKey;
    
    try {
      // First try to get from Supabase edge function environment
      const { data: secretData, error: secretError } = await supabase.functions.invoke("generate-embedding", {
        method: "POST",
        body: { test: true }
      });
      
      if (secretError) {
        console.warn("[Embedding] Could not retrieve API key from edge function, will check for direct access");
      } else if (secretData?.apiKeyAvailable) {
        console.log("[Embedding] API key is available in edge function");
        return await generateEmbeddingWithEdgeFunction(resumeText, userId, resumeId);
      }
    } catch (edgeFunctionError) {
      console.warn("[Embedding] Edge function test failed:", edgeFunctionError);
    }
    
    // Fallback to direct environment variables if available in the browser context
    geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!geminiApiKey) {
      console.error("[Embedding] Error: Missing GEMINI_API_KEY environment variable");
      return;
    }

    // Initialize AI client
    const ai = new GoogleGenerativeAI(geminiApiKey);
    const model = ai.getGenerativeModel({ 
      model: "text-embedding-004" // Updated to latest embedding model
    });

    // Generate embedding
    console.log(`[Embedding] Starting embedding generation for user ${userId}`);
    const result = await model.embedContent(resumeText);
    const embedding = result.embedding.values;

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
      return;
    }

    console.log(`[Embedding] Successfully updated embedding for ${resumeId || userId}`);

  } catch (error) {
    console.error("[Embedding] Critical error:", error instanceof Error ? error.message : "Unknown error");
  }
}

// Helper function to generate embeddings using an edge function
async function generateEmbeddingWithEdgeFunction(
  resumeText: string,
  userId: string,
  resumeId?: string
) {
  try {
    console.log("[Embedding] Generating embedding via edge function");
    
    const { data, error } = await supabase.functions.invoke("generate-embedding", {
      method: "POST",
      body: { resumeText, userId, resumeId }
    });
    
    if (error) {
      console.error("[Embedding] Edge function error:", error);
      return;
    }
    
    console.log("[Embedding] Edge function result:", data);
    return data;
  } catch (error) {
    console.error("[Embedding] Edge function call failed:", error);
  }
}

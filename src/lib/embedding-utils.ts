
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

    // Get API key from environment
    const geminiApiKey = process.env.GEMINI_API_KEY || 
                         process.env.VITE_GEMINI_API_KEY || 
                         process.env.REACT_APP_GEMINI_API_KEY;
                         
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

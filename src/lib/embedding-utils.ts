
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

export async function addResumeEmbedding(
  resumeText: string,
  userId: string,
  resumeId?: string
) {
  try {
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding] Error: Resume text is too short");
      return;
    }

    // Get API key from environment
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
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

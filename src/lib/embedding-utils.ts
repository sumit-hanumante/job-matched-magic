
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

    // Call the Supabase Edge Function to generate embeddings
    console.log(`[Embedding] Calling generate-embedding function for user ${userId}`);
    
    const { data, error } = await supabase.functions.invoke("generate-embedding", {
      method: "POST",
      body: {
        resumeText,
        userId,
        resumeId
      }
    });

    if (error) {
      console.error(`[Embedding] Edge function call failed: ${error.message}`);
      return;
    }

    console.log(`[Embedding] Edge function response:`, data);

  } catch (error) {
    console.error("[Embedding] Critical error:", error instanceof Error ? error.message : "Unknown error");
  }
}

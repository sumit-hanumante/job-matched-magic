
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

/**
 * Generate and store an embedding for resume text using Google's Text Embedding API
 * 
 * @param resumeText The full text of the resume
 * @param userId The user ID of the resume owner
 * @param resumeId Optional resume ID to update (if known)
 */
export async function addResumeEmbedding(resumeText: string, userId: string, resumeId?: string) {
  try {
    console.log("[EmbeddingUtils] Starting embedding generation for resume...");

    if (!resumeText || resumeText.length < 10) {
      console.error("[EmbeddingUtils] Resume text is too short for embedding");
      return;
    }
    
    // 1. Get embedding from Google
    const apiKey = process.env.GEMINI_API_KEY || ""; // Use environment variable 
    if (!apiKey) {
      console.error("[EmbeddingUtils] Missing GEMINI_API_KEY environment variable");
      return;
    }

    const ai = new GoogleGenerativeAI(apiKey);
    console.log("[EmbeddingUtils] Calling Google AI for embedding...");
    
    // Prepare content for embedding - trim if needed
    const contentForEmbedding = resumeText.length > 25000 
      ? resumeText.substring(0, 25000)  // Limit length if needed
      : resumeText;
    
    // Get the embedding model
    const embeddingModel = ai.getGenerativeModel({ model: "embedding-001" });
    
    // Generate embedding using the correct API method
    const embeddingResponse = await embeddingModel.embedContent(contentForEmbedding);
    
    const embedding = embeddingResponse.embedding?.values;
    
    if (!embedding || embedding.length === 0) {
      console.error("[EmbeddingUtils] Failed to generate embedding - empty response");
      return;
    }
    
    console.log(`[EmbeddingUtils] Successfully generated embedding with ${embedding.length} dimensions`);
    
    // 2. Save to database
    if (resumeId) {
      // If we have the specific resume ID, use it
      const { data, error } = await supabase
        .from("resumes")
        .update({ embedding: embedding })
        .eq("id", resumeId)
        .eq("user_id", userId);
      
      if (error) {
        console.error("[EmbeddingUtils] Failed to update resume with embedding:", error);
      } else {
        console.log("[EmbeddingUtils] Successfully updated resume with embedding");
      }
    } else {
      // Otherwise get the most recent resume for this user
      const { data, error } = await supabase
        .from("resumes")
        .update({ embedding: embedding })
        .eq("user_id", userId)
        .eq("order_index", 1); // Get the primary resume
      
      if (error) {
        console.error("[EmbeddingUtils] Failed to update resume with embedding:", error);
      } else {
        console.log("[EmbeddingUtils] Successfully updated resume with embedding");
      }
    }
  } catch (error) {
    console.error("[EmbeddingUtils] Embedding generation failed:", error);
  }
}

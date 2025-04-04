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
    console.log("[EmbeddingUtils] User ID:", userId);
    console.log("[EmbeddingUtils] Resume ID:", resumeId || "Not provided");
    console.log("[EmbeddingUtils] Resume text length:", resumeText.length);

    if (!resumeText || resumeText.length < 10) {
      console.error("[EmbeddingUtils] Resume text is too short for embedding");
      return;
    }
    
    // 1. Get embedding from Google
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.error("[EmbeddingUtils] Missing GEMINI_API_KEY environment variable");
      return;
    }

    const ai = new GoogleGenerativeAI(apiKey);
    console.log("[EmbeddingUtils] Calling Google AI for embedding with API key length:", apiKey.length);
    
    // Prepare content for embedding - trim if needed
    const contentForEmbedding = resumeText.length > 25000 
      ? resumeText.substring(0, 25000)  // Limit length if needed
      : resumeText;
    
    console.log("[EmbeddingUtils] Content prepared for embedding, length:", contentForEmbedding.length);
    
    try {
      // Get the embedding model
      const embeddingModel = ai.getGenerativeModel({ model: "embedding-001" });
      console.log("[EmbeddingUtils] Using embedding model:", "embedding-001");
      
      // Generate embedding using the correct API method
      console.log("[EmbeddingUtils] Calling embedContent method...");
      const embeddingResponse = await embeddingModel.embedContent(contentForEmbedding);
      console.log("[EmbeddingUtils] Embedding response received:", embeddingResponse);
      
      const embedding = embeddingResponse.embedding?.values;
      
      if (!embedding || embedding.length === 0) {
        console.error("[EmbeddingUtils] Failed to generate embedding - empty response");
        return;
      }
      
      console.log(`[EmbeddingUtils] Successfully generated embedding with ${embedding.length} dimensions`);
      console.log("[EmbeddingUtils] First few values:", embedding.slice(0, 5));
      
      // 2. Save to database
      if (resumeId) {
        // If we have the specific resume ID, use it
        console.log(`[EmbeddingUtils] Updating resume with ID ${resumeId} with embedding`);
        
        try {
          const { data, error } = await supabase
            .from("resumes")
            .update({ embedding: embedding })
            .eq("id", resumeId)
            .eq("user_id", userId);
          
          console.log("[EmbeddingUtils] DB update query executed");
          
          if (error) {
            console.error("[EmbeddingUtils] Failed to update resume with embedding:", error);
            console.error("[EmbeddingUtils] Error details:", JSON.stringify(error));
          } else {
            console.log("[EmbeddingUtils] Successfully updated resume with embedding, rows affected:", data);
          }
          
          // Verify the update worked by fetching the resume again
          const { data: verifyData, error: verifyError } = await supabase
            .from("resumes")
            .select("id, embedding")
            .eq("id", resumeId)
            .single();
            
          if (verifyError) {
            console.error("[EmbeddingUtils] Failed to verify embedding update:", verifyError);
          } else {
            const hasEmbedding = verifyData && verifyData.embedding !== null;
            console.log("[EmbeddingUtils] Verification - embedding exists in DB:", hasEmbedding);
          }
        } catch (dbError) {
          console.error("[EmbeddingUtils] Database error during update:", dbError);
        }
      } else {
        // Otherwise get the most recent resume for this user
        console.log(`[EmbeddingUtils] Finding most recent resume for user ${userId}`);
        try {
          const { data, error } = await supabase
            .from("resumes")
            .update({ embedding: embedding })
            .eq("user_id", userId)
            .eq("order_index", 1); // Get the primary resume
          
          if (error) {
            console.error("[EmbeddingUtils] Failed to update resume with embedding:", error);
            console.error("[EmbeddingUtils] Error details:", JSON.stringify(error));
          } else {
            console.log("[EmbeddingUtils] Successfully updated resume with embedding, rows affected:", data);
          }
        } catch (dbError) {
          console.error("[EmbeddingUtils] Database error during update:", dbError);
        }
      }
    } catch (apiError) {
      console.error("[EmbeddingUtils] Error during API call to Google AI:", apiError);
      console.error("[EmbeddingUtils] API Error details:", apiError instanceof Error ? {
        name: apiError.name,
        message: apiError.message,
        stack: apiError.stack
      } : String(apiError));
    }
  } catch (error) {
    console.error("[EmbeddingUtils] Embedding generation failed:", error);
    console.error("[EmbeddingUtils] Error details:", error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error));
  }
}

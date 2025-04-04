
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
    console.log("[EmbeddingUtils] Starting embedding generation process");
    console.log("[EmbeddingUtils] User ID:", userId);
    console.log("[EmbeddingUtils] Resume ID:", resumeId || "Not provided");
    console.log("[EmbeddingUtils] Resume text length:", resumeText.length);

    if (!resumeText || resumeText.length < 10) {
      console.error("[EmbeddingUtils] Resume text is too short for embedding");
      return;
    }
    
    // Check for API key - Check BOTH NEXT_PUBLIC_GEMINI_API_KEY and GEMINI_API_KEY
    // Log all available environment variables to debug
    console.log("[EmbeddingUtils] All available environment variable names:", 
                Object.keys(process.env).filter(key => key.includes('GEMINI')));
    
    // Try different key naming patterns that might be used in the parse-resume function
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                  process.env.GEMINI_API_KEY || 
                  Deno?.env?.get?.('GEMINI_API_KEY') || 
                  Deno?.env?.get?.('NEXT_PUBLIC_GEMINI_API_KEY') || 
                  process.env.GEMINI_KEY || 
                  "";
                  
    console.log("[EmbeddingUtils] Trying to find API key with various names");
    console.log("[EmbeddingUtils] Has NEXT_PUBLIC_GEMINI_API_KEY:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
    console.log("[EmbeddingUtils] Has GEMINI_API_KEY:", !!process.env.GEMINI_API_KEY);
    console.log("[EmbeddingUtils] Has Deno.env GEMINI_API_KEY:", !!Deno?.env?.get?.('GEMINI_API_KEY'));
    
    if (!apiKey) {
      console.error("[EmbeddingUtils] Missing GEMINI API KEY - Could not find key with any common name patterns");
      
      // Let's find what key name is used in the parse-resume function
      console.log("[EmbeddingUtils] Checking for parse-resume function to debug key name...");
      
      try {
        console.log("[EmbeddingUtils] Testing parse-resume function to see what key it uses");
        const { data: testData } = await supabase.functions.invoke("parse-resume", {
          method: "POST",
          body: { test: true }
        });
        console.log("[EmbeddingUtils] Parse-resume test response:", testData);
      } catch (testError) {
        console.error("[EmbeddingUtils] Parse-resume test error:", testError);
      }
      
      return;
    }

    console.log("[EmbeddingUtils] API key available, length:", apiKey.length);
    
    // Prepare content for embedding - trim if needed
    const contentForEmbedding = resumeText.length > 25000 
      ? resumeText.substring(0, 25000)  // Limit length if needed
      : resumeText;
    
    console.log("[EmbeddingUtils] Content prepared for embedding, length:", contentForEmbedding.length);
    console.log("[EmbeddingUtils] First 100 chars of content:", contentForEmbedding.substring(0, 100));
    
    try {
      // Initialize the Google AI client
      console.log("[EmbeddingUtils] Initializing Google AI client");
      const ai = new GoogleGenerativeAI(apiKey);
      
      // Get the embedding model
      console.log("[EmbeddingUtils] Getting embedding model");
      const embeddingModel = ai.getGenerativeModel({ model: "embedding-001" });
      
      // Generate embedding
      console.log("[EmbeddingUtils] BEFORE API CALL: About to call embedContent");
      const embeddingResponse = await embeddingModel.embedContent(contentForEmbedding);
      console.log("[EmbeddingUtils] AFTER API CALL: Received response from embedContent");
      
      // Log the full response for debugging
      console.log("[EmbeddingUtils] Raw embedding response:", JSON.stringify(embeddingResponse));
      
      if (embeddingResponse.embedding && embeddingResponse.embedding.values) {
        console.log("[EmbeddingUtils] Embedding values count:", embeddingResponse.embedding.values.length);
        console.log("[EmbeddingUtils] First 5 embedding values:", embeddingResponse.embedding.values.slice(0, 5));
      } else {
        console.error("[EmbeddingUtils] No embedding values in response");
      }
      
      // At this point, we're just logging, not storing anything
      console.log("[EmbeddingUtils] Embedding generation completed. Not storing in database as requested.");
      
    } catch (apiError) {
      console.error("[EmbeddingUtils] Error during API call to Google AI:", apiError);
      console.error("[EmbeddingUtils] Error details:", apiError instanceof Error ? {
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

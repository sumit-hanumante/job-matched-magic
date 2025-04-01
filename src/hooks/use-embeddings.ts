
import { supabase } from "@/lib/supabase";

export interface EmbeddingResponse {
  success: boolean;
  embeddings?: number[][];
  error?: string;
  processingTime?: number;
}

/**
 * Hook for generating and managing text embeddings using Gemini API
 */
export const useEmbeddings = () => {
  /**
   * Test if the embedding function is working
   */
  const testEmbeddingFunction = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { test: true }
      });
      
      if (error) {
        console.error("[Embeddings] Function test error:", error);
        return false;
      }
      
      return data?.success === true;
    } catch (error) {
      console.error("[Embeddings] Failed to test function:", error);
      return false;
    }
  };

  /**
   * Generate embeddings for a batch of texts
   * @param texts Array of text strings to generate embeddings for
   * @returns Array of embedding vectors or null on error
   */
  const generateEmbeddings = async (texts: string[]): Promise<number[][] | null> => {
    if (!texts || texts.length === 0) {
      console.error("[Embeddings] No texts provided");
      return null;
    }

    try {
      // Filter out empty texts
      const validTexts = texts.filter(text => text && text.trim().length > 0);
      
      if (validTexts.length === 0) {
        console.error("[Embeddings] No valid texts after filtering");
        return null;
      }
      
      // Invoke the edge function
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { texts: validTexts }
      });
      
      if (error) {
        throw error;
      }
      
      if (!data?.success || !data.embeddings) {
        const errorMsg = data?.error || "Failed to generate embeddings";
        throw new Error(errorMsg);
      }
      
      return data.embeddings;
    } catch (error) {
      console.error("[Embeddings] Error generating embeddings:", error);
      return null;
    }
  };

  /**
   * Generate a single embedding from text
   * @param text Text to generate embedding for
   * @returns Embedding vector or null on error
   */
  const generateSingleEmbedding = async (text: string): Promise<number[] | null> => {
    if (!text || text.trim().length === 0) {
      console.error("[Embeddings] Empty text provided");
      return null;
    }
    
    const embeddings = await generateEmbeddings([text]);
    return embeddings ? embeddings[0] : null;
  };
  
  return {
    testEmbeddingFunction,
    generateEmbeddings,
    generateSingleEmbedding
  };
};

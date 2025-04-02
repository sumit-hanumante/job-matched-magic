
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export interface EmbeddingResponse {
  success: boolean;
  embeddings?: number[][];
  error?: string;
  processingTime?: number;
  processedCount?: number;
}

/**
 * Hook for generating and managing text embeddings using Gemini API
 * Optimized for both batch processing (jobs) and single processing (resumes)
 */
export const useEmbeddings = () => {
  const { toast } = useToast();
  
  /**
   * Test if the embedding function is working
   */
  const testEmbeddingFunction = async (): Promise<boolean> => {
    try {
      console.log("[Embeddings] Testing embedding function...");
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { test: true }
      });
      
      if (error) {
        console.error("[Embeddings] Function test error:", error);
        return false;
      }
      
      console.log("[Embeddings] Function test response:", data);
      return data?.success === true;
    } catch (error) {
      console.error("[Embeddings] Failed to test function:", error);
      return false;
    }
  };

  /**
   * Generate embeddings for a batch of texts
   * Optimized for processing large batches of job descriptions
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
      
      console.log("[Embeddings] Generating embeddings for", validTexts.length, "texts");
      
      // Invoke the edge function
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { texts: validTexts }
      });
      
      if (error) {
        console.error("[Embeddings] Function invocation error:", error);
        toast({
          variant: "destructive",
          title: "Embedding generation failed",
          description: `Error: ${error.message}`
        });
        throw error;
      }
      
      console.log("[Embeddings] Function response:", data);
      
      if (!data?.success || !data.embeddings) {
        const errorMsg = data?.error || "Failed to generate embeddings";
        console.error("[Embeddings] Error in response:", errorMsg);
        toast({
          variant: "destructive",
          title: "Embedding generation failed",
          description: errorMsg
        });
        throw new Error(errorMsg);
      }
      
      console.log(`[Embeddings] Successfully generated ${data.embeddings.length} embeddings in ${data.processingTime}ms`);
      return data.embeddings;
    } catch (error) {
      console.error("[Embeddings] Error generating embeddings:", error);
      return null;
    }
  };

  /**
   * Generate a single embedding from text
   * Used for immediate processing of resume uploads
   * @param text Text to generate embedding for
   * @returns Embedding vector or null on error
   */
  const generateSingleEmbedding = async (text: string): Promise<number[] | null> => {
    if (!text || text.trim().length === 0) {
      console.error("[Embeddings] Empty text provided");
      return null;
    }
    
    console.log("[Embeddings] Generating single embedding for text:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));
    
    const embeddings = await generateEmbeddings([text]);
    return embeddings ? embeddings[0] : null;
  };
  
  /**
   * Process a resume by generating and storing its embedding
   * Called immediately after a resume is uploaded and parsed
   * @param resumeId ID of the resume to process
   * @param resumeText Text of the resume
   * @returns Boolean indicating success
   */
  const processResumeEmbedding = async (resumeId: string, resumeText: string): Promise<boolean> => {
    try {
      console.log(`[ResumeEmbedding] Processing embedding for resume ${resumeId}`);
      
      if (!resumeText || resumeText.trim().length === 0) {
        console.error("[ResumeEmbedding] Empty resume text");
        return false;
      }
      
      // Generate embedding
      const embedding = await generateSingleEmbedding(resumeText);
      
      if (!embedding) {
        console.error("[ResumeEmbedding] Failed to generate embedding");
        return false;
      }
      
      // Store embedding in the database
      const { error: updateError } = await supabase
        .from('resumes')
        .update({ embedding })
        .eq('id', resumeId);
      
      if (updateError) {
        console.error("[ResumeEmbedding] Failed to update resume with embedding:", updateError);
        return false;
      }
      
      console.log(`[ResumeEmbedding] Successfully updated resume ${resumeId} with embedding`);
      return true;
    } catch (error) {
      console.error("[ResumeEmbedding] Error processing resume embedding:", error);
      return false;
    }
  };
  
  return {
    testEmbeddingFunction,
    generateEmbeddings,
    generateSingleEmbedding,
    processResumeEmbedding
  };
};

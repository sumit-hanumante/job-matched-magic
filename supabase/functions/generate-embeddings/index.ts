
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to implement retry logic
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  try {
    console.log(`[Embeddings] Attempting operation with ${retries} retries remaining`);
    return await fn();
  } catch (error) {
    console.error(`[Embeddings] Operation failed:`, error);
    
    if (retries > 0) {
      console.log(`[Embeddings] Retrying after ${delayMs}ms delay...`);
      await new Promise(res => setTimeout(res, delayMs));
      return withRetry(fn, retries - 1, delayMs * 1.5); // Exponential backoff
    }
    
    console.error(`[Embeddings] All retries failed`);
    throw error;
  }
}

// Function to generate embeddings for a batch of texts
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Log batch info for monitoring
  console.log(`[Embeddings] Generating embeddings for batch of ${texts.length} texts`);

  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  
  // Process texts to ensure they are valid
  const validTexts = texts.map(t => (t || "").trim() || "empty document");
  
  // Generate embeddings for the batch
  const result = await withRetry(async () => {
    try {
      const response = await model.batchEmbedContent({
        requests: validTexts.map(text => ({ content: text }))
      });
      return response;
    } catch (error) {
      console.error("[Embeddings] Batch embedding error:", error);
      throw error;
    }
  });
  
  // Extract embeddings from the response
  const embeddings = result.embeddings.map(emb => 
    emb.values || []
  );
  
  const processingTime = Date.now() - startTime;
  console.log(`[Embeddings] Generated ${embeddings.length} embeddings in ${processingTime}ms`);
  
  return embeddings;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[Embeddings] Error: Empty request body");
      throw new Error("Empty request body");
    }

    // Handle test request
    if (body.test === true) {
      console.log("[Embeddings] Test request received");
      return new Response(
        JSON.stringify({
          success: true,
          message: "Embedding function is working correctly"
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          }
        }
      );
    }

    // Process normal embedding request
    const texts = body.texts;
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("Invalid 'texts' array in request body");
    }

    const startTime = Date.now();
    console.log(`[Embeddings] Processing ${texts.length} texts for embedding`);

    // Generate embeddings
    const embeddings = await generateEmbeddings(texts);
    
    // Return success response
    const processingTime = Date.now() - startTime;
    return new Response(
      JSON.stringify({
        success: true,
        embeddings,
        processingTime,
        processedCount: embeddings.length
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  } catch (error) {
    // Return error response
    console.error("[Embeddings] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { 
        status: 200, // Keep 200 to allow client-side error handling
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }
      }
    );
  }
});

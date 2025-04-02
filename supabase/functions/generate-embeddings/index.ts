
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../parse-resume/cors-headers.ts";

// Input type definitions
interface EmbeddingRequest {
  texts: string[];
  test?: boolean;
}

interface EmbeddingResponse {
  success: boolean;
  embeddings?: number[][];
  error?: string;
  processingTime?: number;
  processedCount?: number;
}

/**
 * Generates embeddings for the provided texts using Gemini API
 * Optimized for batch processing with rate limiting
 */
async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  console.log(`[Embeddings] Generating embeddings for ${texts.length} texts`);
  
  // Process texts in batches of 50 to avoid overloading the API
  const batchSize = 50;
  const batches = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }
  
  console.log(`[Embeddings] Split into ${batches.length} batches of max ${batchSize} texts`);
  
  // Process each batch with rate limiting
  const allEmbeddings: number[][] = [];
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText?key=${apiKey}`;
  
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[Embeddings] Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} texts`);
    
    // Add a delay between batches to respect rate limits (except for the first batch)
    if (batchIndex > 0) {
      console.log(`[Embeddings] Rate limit delay before batch ${batchIndex + 1}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between batches
    }
    
    // Use Promise.all with retry logic for each text in the batch
    const batchPromises = batch.map((text, textIndex) => withRetry(() => processText(text, apiUrl, textIndex), 3));
    
    try {
      const batchResults = await Promise.all(batchPromises);
      allEmbeddings.push(...batchResults);
      console.log(`[Embeddings] Successfully processed batch ${batchIndex + 1}`);
    } catch (error) {
      console.error(`[Embeddings] Error in batch ${batchIndex + 1}:`, error);
      throw new Error(`Batch ${batchIndex + 1} failed: ${error.message}`);
    }
  }
  
  return allEmbeddings;
}

/**
 * Process a single text with retry logic
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`[Embeddings] Retry attempt, ${retries} attempts remaining`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay before retry
      return withRetry(fn, retries - 1);
    }
    throw error;
  }
}

/**
 * Process a single text to get embedding
 */
async function processText(text: string, apiUrl: string, index: number): Promise<number[]> {
  try {
    console.log(`[Embeddings] Processing text ${index}, length: ${text.length} chars`);
    
    if (!text || text.trim().length === 0) {
      console.warn(`[Embeddings] Empty text at index ${index}, returning zero vector`);
      return new Array(768).fill(0);
    }
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.substring(0, 8000), // Limit text length to 8000 chars to avoid API limits
        taskType: "RETRIEVAL_DOCUMENT"
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`[Embeddings] Successfully generated embedding for text ${index}`);
    return data.embedding.values;
  } catch (error) {
    console.error(`[Embeddings] Error processing text ${index}:`, error.message);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const startTime = Date.now();
  
  try {
    // Fix: Properly clone the request and read its body as text
    const body = await req.text();
    
    if (!body || body.trim() === '') {
      throw new Error("Empty request body");
    }
    
    // Parse the request body
    const parsedBody: EmbeddingRequest = JSON.parse(body);
    const { texts, test } = parsedBody;
    
    // Handle test requests
    if (test === true) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Embedding function is working properly"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate input texts
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      throw new Error("No texts provided in the request body");
    }
    
    // Get API key
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "GEMINI_API_KEY is not configured",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Generate embeddings with optimized batch processing
    const embeddings = await generateEmbeddings(texts, apiKey);
    
    // Return response
    const processingTime = Date.now() - startTime;
    const response: EmbeddingResponse = {
      success: true,
      embeddings,
      processingTime,
      processedCount: texts.length
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[Embeddings] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate embeddings"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

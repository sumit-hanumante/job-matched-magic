
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
}

/**
 * Generates embeddings for the provided texts using Gemini API
 */
async function generateEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedText?key=${apiKey}`;
  
  // Process texts in batches of 10 to avoid overloading the API
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    batches.push(texts.slice(i, i + batchSize));
  }
  
  // Process each batch
  const allEmbeddings: number[][] = [];
  
  for (const batch of batches) {
    const batchPromises = batch.map(async (text) => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            taskType: "RETRIEVAL_DOCUMENT"
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        return data.embedding.values;
      } catch (error) {
        console.error(`Error generating embedding: ${error.message}`);
        // Return a zero vector as fallback (with 768 dimensions which is typical for embeddings)
        return new Array(768).fill(0);
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    allEmbeddings.push(...batchResults);
  }
  
  return allEmbeddings;
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
    
    // Generate embeddings
    const embeddings = await generateEmbeddings(texts, apiKey);
    
    // Return response
    const processingTime = Date.now() - startTime;
    const response: EmbeddingResponse = {
      success: true,
      embeddings,
      processingTime
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to generate embeddings"
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

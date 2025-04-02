
import { supabase } from "@/lib/supabase";
import { useEmbeddings } from "@/hooks/use-embeddings";

/**
 * Process a batch of jobs to generate embeddings
 * Called after job scraping is complete
 */
export async function processJobEmbeddings(): Promise<{
  success: boolean;
  processed: number;
  error?: string;
}> {
  console.log("[JobEmbedding] Starting batch job embedding process");
  
  try {
    // Find jobs without embeddings, limit to 100 per batch
    const { data: jobsWithoutEmbeddings, error: fetchError } = await supabase
      .from('jobs')
      .select('id, description, title')
      .is('embedding', null)
      .limit(100);
    
    if (fetchError) {
      console.error("[JobEmbedding] Error fetching jobs:", fetchError);
      return { success: false, processed: 0, error: fetchError.message };
    }
    
    if (!jobsWithoutEmbeddings || jobsWithoutEmbeddings.length === 0) {
      console.log("[JobEmbedding] No jobs without embeddings found");
      return { success: true, processed: 0 };
    }
    
    console.log(`[JobEmbedding] Found ${jobsWithoutEmbeddings.length} jobs without embeddings`);
    
    // Prepare job texts for embedding (combine title and description for better context)
    const jobTexts = jobsWithoutEmbeddings.map(job => 
      `${job.title}\n${job.description}`.trim()
    );
    
    const jobIds = jobsWithoutEmbeddings.map(job => job.id);
    
    // Initialize the embeddings hook
    const { generateEmbeddings } = useEmbeddings();
    
    // Generate embeddings for all job texts in a batch
    console.log(`[JobEmbedding] Generating embeddings for ${jobTexts.length} jobs`);
    const embeddings = await generateEmbeddings(jobTexts);
    
    if (!embeddings) {
      console.error("[JobEmbedding] Failed to generate embeddings");
      return { success: false, processed: 0, error: "Failed to generate embeddings" };
    }
    
    console.log(`[JobEmbedding] Successfully generated ${embeddings.length} embeddings`);
    
    // Process each job with its embedding
    let successCount = 0;
    
    for (let i = 0; i < jobIds.length; i++) {
      const jobId = jobIds[i];
      const embedding = embeddings[i];
      
      if (!embedding) {
        console.error(`[JobEmbedding] No embedding generated for job ${jobId}`);
        continue;
      }
      
      // Update the job with its embedding
      const { error: updateError } = await supabase
        .from('jobs')
        .update({ embedding })
        .eq('id', jobId);
      
      if (updateError) {
        console.error(`[JobEmbedding] Error updating job ${jobId} with embedding:`, updateError);
      } else {
        successCount++;
      }
    }
    
    console.log(`[JobEmbedding] Successfully updated ${successCount} out of ${jobIds.length} jobs`);
    
    return {
      success: true,
      processed: successCount,
      error: successCount < jobIds.length ? 
        `Failed to update ${jobIds.length - successCount} jobs` : undefined
    };
    
  } catch (error) {
    console.error("[JobEmbedding] Process error:", error);
    return { 
      success: false, 
      processed: 0, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}

/**
 * Schedule job embedding processing
 * This should be called after the job scraping scheduler
 */
export function scheduleJobEmbeddingProcess(): void {
  // This is just a placeholder function to be called by the edge function
  // The actual scheduling happens in the cleanup-jobs edge function
  console.log("[JobEmbedding] Job embedding process scheduled");
}

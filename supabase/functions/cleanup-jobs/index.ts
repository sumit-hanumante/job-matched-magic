
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Process job embeddings in batches to avoid rate limits
 */
async function processJobEmbeddings(supabase, batchSize = 50, maxCallsPerMinute = 50) {
  console.log("Deepak_Debug: Starting job embeddings processing");
  
  try {
    // Find jobs without embeddings
    const { data: jobsWithoutEmbeddings, error: fetchError } = await supabase
      .from('jobs')
      .select('id, description, title')
      .is('embedding', null)
      .order('posted_date', { ascending: false })
      .limit(500); // Process up to 500 jobs in one cleanup run

    if (fetchError) {
      throw new Error(`Error fetching jobs without embeddings: ${fetchError.message}`);
    }

    const totalJobs = jobsWithoutEmbeddings?.length || 0;
    console.log(`Deepak_Debug: Found ${totalJobs} jobs without embeddings`);
    
    if (totalJobs === 0) {
      return { processed: 0, batches: 0 };
    }

    // Process jobs in batches to respect rate limits
    const batches = [];
    for (let i = 0; i < totalJobs; i += batchSize) {
      batches.push(jobsWithoutEmbeddings.slice(i, i + batchSize));
    }
    
    console.log(`Deepak_Debug: Split into ${batches.length} batches of up to ${batchSize} jobs`);

    let successfulUpdates = 0;
    let batchesProcessed = 0;

    // Process each batch with delay between batches to respect rate limits
    for (const batch of batches) {
      console.log(`Deepak_Debug: Processing batch ${batchesProcessed + 1} of ${batches.length} (${batch.length} jobs)`);
      
      // Prepare job texts by combining title and description for better embeddings
      const jobTexts = batch.map(job => 
        `${job.title}\n${job.description}`.trim()
      );
      
      const jobIds = batch.map(job => job.id);
      
      try {
        // Call the embedding function
        const { data: embeddingResponse, error: embeddingError } = await supabase.functions.invoke(
          "generate-embeddings",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: { texts: jobTexts }
          }
        );
        
        if (embeddingError) {
          console.error(`Deepak_Debug: Batch ${batchesProcessed + 1} failed:`, embeddingError);
          continue;
        }
        
        if (!embeddingResponse?.success) {
          console.error(`Deepak_Debug: Batch ${batchesProcessed + 1} returned error:`, 
                        embeddingResponse?.error || "Unknown error");
          continue;
        }
        
        const embeddings = embeddingResponse.embeddings;
        console.log(`Deepak_Debug: Generated ${embeddings?.length || 0} embeddings for batch ${batchesProcessed + 1}`);
        
        // Update each job with its embedding
        for (let i = 0; i < jobIds.length; i++) {
          const jobId = jobIds[i];
          const embedding = embeddings?.[i];
          
          if (!embedding) {
            console.error(`Deepak_Debug: No embedding generated for job ${jobId}`);
            continue;
          }
          
          // Update the job with its embedding
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ embedding })
            .eq('id', jobId);
          
          if (updateError) {
            console.error(`Deepak_Debug: Error updating job ${jobId} with embedding:`, updateError.message);
          } else {
            successfulUpdates++;
          }
        }

        batchesProcessed++;
        
        // Add delay between batches to respect rate limits
        if (batchesProcessed < batches.length) {
          console.log(`Deepak_Debug: Waiting 5 seconds before processing next batch...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay between batches
        }
      } catch (batchError) {
        console.error(`Deepak_Debug: Error processing batch ${batchesProcessed + 1}:`, batchError);
      }
      
      // If we've reached our limit of API calls per minute, take a longer break
      if (batchesProcessed % maxCallsPerMinute === 0 && batchesProcessed > 0) {
        console.log(`Deepak_Debug: Reached ${maxCallsPerMinute} API calls, waiting 60 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1 minute pause
      }
    }

    console.log(`Deepak_Debug: Job embedding processing complete. Updated ${successfulUpdates} out of ${totalJobs} jobs`);
    return {
      processed: successfulUpdates,
      batches: batchesProcessed
    };
  } catch (error) {
    console.error("Deepak_Debug: Error in job embedding processing:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Deepak_Debug: Starting cleanup-jobs process");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Cleanup old jobs (older than 30 days)
    console.log("Deepak_Debug: Cleaning up old jobs...");
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: deletedJobs, error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .lt('posted_date', thirtyDaysAgo.toISOString())
      .select('id');

    if (deleteError) {
      throw new Error(`Failed to delete old jobs: ${deleteError.message}`);
    }

    const deletedCount = deletedJobs?.length || 0;
    console.log(`Deepak_Debug: Deleted ${deletedCount} old jobs`);

    // 2. Process embeddings for jobs without embeddings (batch processing)
    console.log("Deepak_Debug: Processing job embeddings...");
    const embeddingResult = await processJobEmbeddings(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup successful. Deleted ${deletedCount} old jobs and processed embeddings for ${embeddingResult.processed} jobs in ${embeddingResult.batches} batches.`,
        deletedCount,
        embeddingsProcessed: embeddingResult.processed,
        batchesProcessed: embeddingResult.batches
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Deepak_Debug: Error in cleanup-jobs:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting cleanup-jobs process");
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Cleanup old jobs (older than 30 days)
    console.log("Cleaning up old jobs...");
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
    console.log(`Deleted ${deletedCount} old jobs`);

    // 2. Process embeddings for jobs without embeddings
    console.log("Finding jobs without embeddings...");
    const { data: jobsWithoutEmbeddings, error: fetchError } = await supabase
      .from('jobs')
      .select('id, description, title')
      .is('embedding', null)
      .limit(100);

    if (fetchError) {
      throw new Error(`Error fetching jobs: ${fetchError.message}`);
    }

    const jobCount = jobsWithoutEmbeddings?.length || 0;
    console.log(`Found ${jobCount} jobs without embeddings`);

    if (jobCount > 0) {
      // Process jobs in batches
      const jobTexts = jobsWithoutEmbeddings.map(job => 
        `${job.title}\n${job.description}`.trim()
      );
      
      const jobIds = jobsWithoutEmbeddings.map(job => job.id);
      
      // Call the embedding function
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      console.log(`Generating embeddings for ${jobTexts.length} jobs`);
      
      // Invoke the generate-embeddings edge function
      const { data: embeddingResponse, error: embeddingError } = await supabase.functions.invoke(
        "generate-embeddings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: { texts: jobTexts }
        }
      );
      
      if (embeddingError) {
        throw new Error(`Embedding generation failed: ${embeddingError.message}`);
      }
      
      if (!embeddingResponse?.success) {
        throw new Error(`Embedding generation failed: ${embeddingResponse?.error || "Unknown error"}`);
      }
      
      const embeddings = embeddingResponse.embeddings;
      console.log(`Generated ${embeddings?.length || 0} embeddings`);
      
      // Process each job with its embedding
      let successCount = 0;
      
      for (let i = 0; i < jobIds.length; i++) {
        const jobId = jobIds[i];
        const embedding = embeddings?.[i];
        
        if (!embedding) {
          console.error(`No embedding generated for job ${jobId}`);
          continue;
        }
        
        // Update the job with its embedding
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ embedding })
          .eq('id', jobId);
        
        if (updateError) {
          console.error(`Error updating job ${jobId} with embedding: ${updateError.message}`);
        } else {
          successCount++;
        }
      }
      
      console.log(`Successfully updated ${successCount} out of ${jobIds.length} jobs`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup successful. Deleted ${deletedCount} old jobs and processed embeddings for ${jobCount} jobs.`,
        deletedCount,
        embeddingsProcessed: jobCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Error in cleanup-jobs:", error);
    
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

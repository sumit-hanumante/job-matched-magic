
import { supabase } from "@/lib/supabase";

export async function addResumeEmbedding(
  resumeText: string,
  userId: string,
  resumeId?: string
) {
  try {
    // Log that we're about to process the resume
    console.log(`[Embedding] Starting embedding generation for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Embedding] Resume text length: ${resumeText.length} chars`);
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding] Error: Resume text is too short");
      return;
    }

    // Call the edge function to generate embedding
    console.log(`[Embedding] Calling generate-embedding edge function`);
    
    // Prepare the payload - making sure to provide all required parameters
    const payload = { 
      resumeText, 
      userId, 
      resumeId 
    };
    
    console.log(`[Embedding] Payload prepared:`, {
      userId,
      resumeId: resumeId || 'not provided',
      textLength: resumeText.length
    });
    
    const { data, error: functionError } = await supabase.functions.invoke("generate-embedding", {
      method: "POST",
      body: payload
    });

    if (functionError) {
      console.error(`[Embedding] Edge function error:`, functionError);
      return;
    }
    
    if (!data) {
      console.error(`[Embedding] Edge function returned no data`);
      return;
    }

    if (!data.success || !data.embedding) {
      console.error(`[Embedding] Edge function returned error or no embedding:`, data);
      return;
    }

    const embedding = data.embedding;
    console.log(`[Embedding] Successfully received embedding with ${embedding.length} dimensions`);

    // Prepare update data
    const updateData = {
      embedding
    };
    
    console.log(`[Embedding] Updating database for ${resumeId ? 'resume ID: ' + resumeId : 'user ID: ' + userId}`);

    // Update database
    if (resumeId) {
      const { error } = await supabase
        .from('resumes')
        .update(updateData)
        .eq('id', resumeId);

      if (error) {
        console.error(`[Embedding] Database update failed for resume ${resumeId}:`, error);
        return;
      }
      
      console.log(`[Embedding] Successfully updated embedding for resume ${resumeId}`);
    } else {
      const { error } = await supabase
        .from('resumes')
        .update(updateData)
        .eq('user_id', userId)
        .eq('order_index', 1); // Update the primary resume
        
      if (error) {
        console.error(`[Embedding] Database update failed for user ${userId}:`, error);
        return;
      }
      
      console.log(`[Embedding] Successfully updated embedding for user ${userId}`);
    }

  } catch (error) {
    console.error("[Embedding] Critical error:", error instanceof Error ? 
      {message: error.message, stack: error.stack} : "Unknown error");
  }
}

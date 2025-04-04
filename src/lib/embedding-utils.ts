
import { supabase } from "@/lib/supabase";

export async function addResumeEmbedding(
  resumeText: string,
  userId: string,
  resumeId?: string
) {
  try {
    // Log that we're about to process the resume
    console.log(`[Embedding] Resume text (${resumeText.length} chars) is being processed for user ${userId}${resumeId ? ` and resume ${resumeId}` : ''}`);
    console.log(`[Embedding] Resume preview: "${resumeText.substring(0, 100)}..."`);
    
    // Validate input
    if (!resumeText || resumeText.length < 50) {
      console.error("[Embedding] Error: Resume text is too short");
      return;
    }

    // Call the edge function to generate embedding
    console.log(`[Embedding] Calling generate-embedding edge function`);
    const { data, error: functionError } = await supabase.functions.invoke("generate-embedding", {
      method: "POST",
      body: { resumeText, userId, resumeId }
    });

    if (functionError) {
      console.error(`[Embedding] Edge function error: ${functionError.message}`);
      return;
    }

    if (!data?.success || !data?.embedding) {
      console.error(`[Embedding] Edge function returned error or no embedding`);
      return;
    }

    const embedding = data.embedding;
    console.log(`[Embedding] Successfully received embedding with ${embedding.length} dimensions`);

    // Prepare update data
    const updateData = {
      embedding
    };

    // Update database
    const { error } = await supabase
      .from('resumes')
      .update(updateData)
      .eq(resumeId ? 'id' : 'user_id', resumeId || userId);

    if (error) {
      console.error(`[Embedding] Database update failed: ${error.message}`);
      return;
    }

    console.log(`[Embedding] Successfully updated embedding for ${resumeId || userId}`);

  } catch (error) {
    console.error("[Embedding] Critical error:", error instanceof Error ? error.message : "Unknown error");
  }
}

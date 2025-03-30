
import { supabase } from "@/lib/supabase";

/**
 * Fetch top job matches for a candidate using vector search.
 * @param candidateEmbedding - The candidate's embedding vector.
 * @returns An array of job matches with job id, title, and similarity distance.
 */
export async function getJobMatches(candidateEmbedding: number[]): Promise<any[]> {
  try {
    // Call the stored procedure "match_jobs" using supabase.rpc
    const { data, error } = await supabase.rpc("match_jobs", { candidate_vector: candidateEmbedding });
    if (error) {
      throw new Error(`RPC error: ${error.message}`);
    }
    return data as any[];
  } catch (error) {
    console.error("Error fetching vector job matches:", error);
    throw error;
  }
}

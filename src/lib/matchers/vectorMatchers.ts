
import { supabase } from "@/integrations/supabase/client";

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

/**
 * Retrieve the most recently created test user's email.
 * This is for testing purposes only and should be removed in production.
 */
export async function getLastTestUserEmail(): Promise<{email: string | null, error: string | null}> {
  try {
    // Query for the most recent test user email
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('full_name', 'Test User')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      return { email: null, error: `Error getting profile: ${error.message}` };
    }

    // Since we can't directly query auth.users, we'll use the user's preferences
    // to indicate they exist, and provide a hint on the email format
    if (data) {
      const randomPart = Math.floor(Math.random() * 10000);
      const emailHint = `tester_${randomPart}@example.com (Note: This is just a format example, the actual number differs)`;
      return { email: `A test user exists with email pattern: tester_XXXX@example.com and password: testpassword123`, error: null };
    }

    return { email: null, error: 'No test users found' };
  } catch (error) {
    console.error("Error finding test user:", error);
    return { email: null, error: 'Internal error occurred' };
  }
}

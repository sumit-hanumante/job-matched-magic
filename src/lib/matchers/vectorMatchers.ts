
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch top job matches for a candidate using vector search.
 * @param candidateEmbedding - The candidate's embedding vector.
 * @returns An array of job matches with job id, title, and similarity distance.
 */
export async function getJobMatches(candidateEmbedding: number[]): Promise<any[]> {
  try {
    // Call the stored procedure "match_jobs" using supabase.rpc
    // The PostgreSQL vector type expects the array to be properly formatted
    const { data, error } = await supabase.rpc("match_jobs", { 
      candidate_vector: candidateEmbedding as unknown as string 
    });
    
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
    // Query for the most recent test user - using the auth.users table via admin API is not possible
    // Instead, we'll look for test users in the profiles table where full_name contains 'Test'
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .ilike('full_name', '%Test%')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      return { email: null, error: `Error getting profile: ${error.message}` };
    }

    // If no test users found
    if (!data || data.length === 0) {
      return { email: null, error: 'No test users found' };
    }

    // We've found a test user - now we need to update their full_name to include the email
    // Since we can't access auth.users directly, we'll fetch the users table using the admin API
    // For now, provide a default test user credential pattern
    return { 
      email: "tester@example.com (password: testpassword123) - Note: This is a placeholder. Please update the 'full_name' field in the profiles table to include the actual email.", 
      error: null 
    };
  } catch (error) {
    console.error("Error finding test user:", error);
    return { email: null, error: 'Internal error occurred' };
  }
}

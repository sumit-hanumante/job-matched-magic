
import { supabase } from "@/lib/supabase";

// Service focused on database operations for resumes
export const useResumeDatabase = () => {
  // Get the current resume
  const getCurrentResume = async (userId: string) => {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();
      
    if (error) {
      console.error("Error fetching current resume:", error);
      throw error;
    }
    
    return data;
  };

  // Shift older resumes to maintain the specified limit (usually 3)
  const shiftOlderResumes = async (userId: string) => {
    try {
      console.log("Shifting resumes for user:", userId);
      
      // First, fetch the count of resumes that will be deleted
      const { data: resumesToDelete, error: fetchCountError } = await supabase
        .from("resumes")
        .select("id")
        .eq("user_id", userId)
        .gte("order_index", 3);
      
      if (fetchCountError) throw fetchCountError;
      const deleteCount = resumesToDelete?.length || 0;
      
      // Delete resumes that would be pushed beyond index 3
      const { error: deleteError } = await supabase
        .from("resumes")
        .delete()
        .eq("user_id", userId)
        .gte("order_index", 3);
      
      if (deleteError) throw deleteError;
      console.log(`Successfully deleted ${deleteCount} resumes with order_index ≥ 3`);
      
      // Get existing resumes that need to be shifted
      const { data: existingResumes, error: fetchError } = await supabase
        .from("resumes")
        .select("id, order_index")
        .eq("user_id", userId)
        .order("order_index", { ascending: true });
        
      if (fetchError) throw fetchError;
      
      if (!existingResumes || existingResumes.length === 0) {
        console.log("No existing resumes to shift");
        return;
      }
      
      // Update the order index for each existing resume
      for (const resume of existingResumes) {
        const { error: updateError } = await supabase
          .from("resumes")
          .update({ order_index: resume.order_index + 1 })
          .eq("id", resume.id);
          
        if (updateError) throw updateError;
      }
      
      console.log(`Successfully shifted ${existingResumes.length} resumes`);
    } catch (error) {
      console.error("Error shifting resumes:", error);
      throw error;
    }
  };

  // Insert a new resume record
  const insertResume = async (resumeData: Record<string, any>) => {
    console.log("Inserting resume record:", {
      ...resumeData,
      resume_text: resumeData.resume_text ? 
        `${resumeData.resume_text.substring(0, 100)}... (truncated)` : "No text"
    });
    
    const { data, error } = await supabase
      .from("resumes")
      .insert(resumeData)
      .select()
      .single();
      
    if (error) {
      console.error("Database insert failed:", error);
      throw error;
    }
    
    return data;
  };

  // Delete a resume
  const deleteResume = async (resumeId: string) => {
    const { error } = await supabase
      .from("resumes")
      .delete()
      .eq("id", resumeId);
      
    if (error) {
      console.error("Error deleting resume:", error);
      throw error;
    }
  };

  return {
    getCurrentResume,
    shiftOlderResumes,
    insertResume,
    deleteResume
  };
};

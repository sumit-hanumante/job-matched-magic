
import { supabase } from "@/lib/supabase";

export const useResumeService = () => {
  const fetchCurrentResume = async (userId: string) => {
    if (!userId) return null;

    try {
      console.log("Fetching current resume for user:", userId);
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, status, created_at, file_path, extracted_skills")
        .eq("user_id", userId)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching resume:", error);
        return null;
      }

      console.log("Resume fetch result:", data);
      
      if (data) {
        const resume = {
          id: data.id,
          filename: data.file_name,
          status: data.status,
          uploaded_at: data.created_at,
          file_path: data.file_path
        };
        
        if (data.extracted_skills) {
          console.log("Resume has extracted skills:", data.extracted_skills.length);
        } else {
          console.log("Resume does not have extracted skills");
        }
        
        return resume;
      } else {
        console.log("No resume found for user");
        return null;
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
      return null;
    }
  };

  return { fetchCurrentResume };
};

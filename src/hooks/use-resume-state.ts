
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ResumeData } from "@/types/resume";

export const useResumeState = (userId: string | undefined) => {
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);

  const fetchCurrentResume = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, status, created_at, file_path, order_index, total_years_experience, possible_job_titles")
        .eq("user_id", userId)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching resume:", error);
        return;
      }

      if (data) {
        setCurrentResume({
          id: data.id,
          filename: data.file_name,
          status: data.status || 'parsed',
          uploaded_at: new Date(data.created_at).toLocaleDateString(),
          file_path: data.file_path,
          is_primary: data.order_index === 1,
          total_years_experience: data.total_years_experience,
          possible_job_titles: data.possible_job_titles
        });
      } else {
        setCurrentResume(null);
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchCurrentResume();
    }
  }, [userId]);

  return { currentResume, fetchCurrentResume };
};

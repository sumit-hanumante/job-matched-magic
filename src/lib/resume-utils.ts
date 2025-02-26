
import { supabase } from "@/lib/supabase";

export const shiftResumes = async (userId: string) => {
  try {
    const { data: resumes, error: fetchError } = await supabase
      .from('resumes')
      .select('id, order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (fetchError) throw fetchError;

    if (resumes) {
      for (const resume of resumes) {
        const newIndex = resume.order_index + 1;
        if (newIndex <= 3) {
          await supabase
            .from('resumes')
            .update({ order_index: newIndex })
            .eq('id', resume.id);
        } else {
          await supabase
            .from('resumes')
            .delete()
            .eq('id', resume.id);
        }
      }
    }
  } catch (error) {
    console.error('Error shifting resumes:', error);
    throw error;
  }
};

export const fetchCurrentResume = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('resumes')
      .select('id, file_name, status, created_at, file_path')
      .eq('user_id', userId)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching resume:', error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        filename: data.file_name,
        status: data.status,
        uploaded_at: new Date(data.created_at).toLocaleDateString(),
        file_path: data.file_path
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching resume:', error);
    return null;
  }
};

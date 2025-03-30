
import { supabase } from "@/lib/supabase";

/**
 * Shifts resume order_index values for a user to make space for a new primary resume
 * - Resumes with order_index = 1 will be moved to order_index = 2
 * - Resumes with order_index = 2 will be moved to order_index = 3
 * - Resumes with order_index = 3 or higher will be deleted
 * 
 * @param userId - The ID of the user whose resumes are being managed
 */
export const shiftResumes = async (userId: string) => {
  try {
    console.log("Shifting resumes for user:", userId);
    
    // First, delete any resumes with order_index 3 or higher (keep only 2 previous resumes)
    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('user_id', userId)
      .gte('order_index', 3);

    if (deleteError) {
      console.error('Error deleting old resumes:', deleteError);
      // Continue with the process even if deletion fails
    } else {
      console.log('Successfully deleted resumes with order_index ≥ 3');
    }
    
    // Next, increment order_index for existing resumes (1 becomes 2, 2 becomes 3)
    const { data: resumes, error: fetchError } = await supabase
      .from('resumes')
      .select('id, order_index')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (fetchError) {
      console.error('Error fetching resumes for shifting:', fetchError);
      throw fetchError;
    }

    // Update order_index for each resume
    const updatePromises = resumes?.map(resume => 
      supabase
        .from('resumes')
        .update({ order_index: resume.order_index + 1 })
        .eq('id', resume.id)
    );

    if (updatePromises && updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`Successfully shifted ${updatePromises.length} resumes`);
    } else {
      console.log('No existing resumes to shift');
    }
  } catch (error) {
    console.error('Error in shiftResumes function:', error);
    throw error;
  }
};

/**
 * Fetches the current primary resume for a user
 * 
 * @param userId - The ID of the user whose resume should be fetched
 * @returns The user's primary resume or null if no resume is found
 */
export const fetchCurrentResume = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('resumes')
      .select(`
        id, 
        file_name, 
        status, 
        created_at, 
        file_path, 
        order_index, 
        total_years_experience,
        possible_job_titles
      `)
      .eq('user_id', userId)
      .eq('order_index', 1)  // Get primary resume (order_index = 1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching primary resume:', error);
      return null;
    }

    if (data) {
      return {
        id: data.id,
        filename: data.file_name,
        status: data.status,
        uploaded_at: new Date(data.created_at).toLocaleDateString(),
        file_path: data.file_path,
        is_primary: data.order_index === 1,
        total_years_experience: data.total_years_experience,
        possible_job_titles: data.possible_job_titles
      };
    }
    return null;
  } catch (error) {
    console.error('Error in fetchCurrentResume:', error);
    return null;
  }
};

/**
 * Fetches all resumes for a user
 * 
 * @param userId - The ID of the user whose resumes should be fetched
 * @returns Array of user resumes ordered by order_index
 */
export const fetchAllResumes = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('resumes')
      .select(`
        id, 
        file_name, 
        status, 
        created_at, 
        file_path, 
        order_index, 
        total_years_experience,
        possible_job_titles
      `)
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching all resumes:', error);
      return [];
    }

    return data.map(resume => ({
      id: resume.id,
      filename: resume.file_name,
      status: resume.status,
      uploaded_at: new Date(resume.created_at).toLocaleDateString(),
      file_path: resume.file_path,
      is_primary: resume.order_index === 1,
      total_years_experience: resume.total_years_experience,
      possible_job_titles: resume.possible_job_titles
    }));
  } catch (error) {
    console.error('Error in fetchAllResumes:', error);
    return [];
  }
};

/**
 * Makes a specific resume the primary resume (order_index = 1)
 * 
 * @param resumeId - The ID of the resume to make primary
 * @param userId - The ID of the user who owns the resume
 * @returns true if successful, false otherwise
 */
export const makePrimaryResume = async (resumeId: string, userId: string) => {
  try {
    // First, shift all existing resumes
    await shiftResumes(userId);
    
    // Then, set the specified resume as the new primary
    const { error } = await supabase
      .from('resumes')
      .update({ order_index: 1 })
      .eq('id', resumeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error making resume primary:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in makePrimaryResume:', error);
    return false;
  }
};

/**
 * Deletes a specific resume
 * 
 * @param resumeId - The ID of the resume to delete
 * @param userId - The ID of the user who owns the resume
 * @returns true if successful, false otherwise
 */
export const deleteResume = async (resumeId: string, userId: string) => {
  try {
    // First, get the file path for the storage bucket
    const { data, error: fetchError } = await supabase
      .from('resumes')
      .select('file_path, order_index')
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching resume for deletion:', fetchError);
      return false;
    }

    // Delete the resume record from the database
    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('id', resumeId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting resume from database:', deleteError);
      return false;
    }

    // Delete the file from storage if we have a file path
    if (data?.file_path) {
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove([data.file_path]);

      if (storageError) {
        console.error('Error deleting resume file from storage:', storageError);
        // We'll still consider this a success since the DB record was deleted
      }
    }
    
    // If we deleted the primary resume, promote the next one to primary if available
    if (data?.order_index === 1) {
      const { data: nextResume, error: nextError } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .eq('order_index', 2)
        .maybeSingle();
        
      if (!nextError && nextResume) {
        await supabase
          .from('resumes')
          .update({ order_index: 1 })
          .eq('id', nextResume.id);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteResume:', error);
    return false;
  }
};

/**
 * Cleans up all resumes for a user
 * 
 * @param userId - The ID of the user whose resumes should be cleaned up
 * @returns true if successful, false otherwise
 */
export const cleanupAllResumes = async (userId: string) => {
  try {
    console.log(`Starting cleanup of all resumes for user: ${userId}`);
    
    // First, get all resumes to find the file paths
    const { data: resumes, error: fetchError } = await supabase
      .from('resumes')
      .select('id, file_path')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Error fetching resumes for cleanup:', fetchError);
      throw fetchError;
    }

    // If there are no resumes, we're done
    if (!resumes || resumes.length === 0) {
      console.log('No resumes found to clean up');
      return true;
    }

    console.log(`Found ${resumes.length} resumes to clean up`);
    
    // Delete files from storage
    const filePaths = resumes.map(resume => resume.file_path).filter(Boolean);
    
    if (filePaths.length > 0) {
      console.log(`Removing ${filePaths.length} files from storage`);
      const { error: storageError } = await supabase.storage
        .from('resumes')
        .remove(filePaths);
  
      if (storageError) {
        console.error('Error removing resume files from storage:', storageError);
        // Continue even if storage cleanup fails
      } else {
        console.log('Successfully removed all resume files from storage');
      }
    }
    
    // Delete all resume records from the database
    console.log('Deleting all resume records from database');
    const { error: deleteError } = await supabase
      .from('resumes')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting resume records:', deleteError);
      throw deleteError;
    }

    console.log('Successfully cleaned up all resumes for user');
    return true;
  } catch (error) {
    console.error('Error in cleanupAllResumes:', error);
    return false;
  }
};

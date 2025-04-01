
import { supabase } from "@/lib/supabase";

// Service focused on file storage operations
export const useStorageService = () => {
  // Ensure the required storage buckets exist
  const ensureStorageBuckets = async () => {
    try {
      console.log("Checking storage buckets...");
      
      // Try to create resumes bucket directly instead of checking first
      try {
        console.log('Creating resumes bucket if not exists...');
        const { data: createData, error: createError } = await supabase.storage.createBucket('resumes', {
          public: false,
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createError) {
          // Ignore error if bucket already exists
          if (!createError.message.includes('already exists')) {
            console.error('Failed to create resumes bucket:', createError);
          } else {
            console.log('Resumes bucket already exists');
          }
        } else {
          console.log('Successfully created resumes bucket:', createData);
        }
      } catch (error: any) {
        console.error('Unexpected error with resumes bucket:', error);
      }
      
      // Try to create temp-resumes bucket directly
      try {
        console.log('Creating temp-resumes bucket if not exists...');
        const { data: createData, error: createError } = await supabase.storage.createBucket('temp-resumes', {
          public: true,
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createError) {
          // Ignore error if bucket already exists
          if (!createError.message.includes('already exists')) {
            console.error('Failed to create temp-resumes bucket:', createError);
          } else {
            console.log('Temp-resumes bucket already exists');
          }
        } else {
          console.log('Successfully created temp-resumes bucket:', createData);
        }
      } catch (error: any) {
        console.error('Unexpected error with temp-resumes bucket:', error);
      }
      
      console.log('Storage buckets initialized successfully');
      
    } catch (error) {
      console.error('Error initializing storage buckets:', error);
    }
  };

  // Upload a file to temp storage (for unauthenticated users)
  const uploadToTempStorage = async (file: File): Promise<string> => {
    const tempFileName = `${crypto.randomUUID()}-${file.name}`;
    console.log(`Creating temporary file: ${tempFileName}`);
    
    await ensureStorageBuckets();
    
    const { data, error: uploadError } = await supabase.storage
      .from("temp-resumes")
      .upload(tempFileName, file);
      
    if (uploadError) {
      console.error("Error uploading temporary file:", uploadError);
      console.error("Error details:", {
        message: uploadError.message,
        name: uploadError.name
      });
      throw uploadError;
    }
    
    console.log("Temporary file uploaded successfully:", data);
    return tempFileName;
  };

  // Upload a file to permanent storage (for authenticated users)
  const uploadToPermanentStorage = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    await ensureStorageBuckets();
    
    console.log(`Uploading file to storage: ${filePath}`);
    console.log("File details:", {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    const { data, error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file);
      
    if (uploadError) {
      console.error("File upload error:", uploadError);
      console.error("Error details:", {
        message: uploadError.message,
        name: uploadError.name,
        path: filePath
      });
      throw uploadError;
    }
    
    console.log("File uploaded successfully to storage:", data);
    return filePath;
  };

  // Generate a public URL for a file
  const getFilePublicUrl = (filePath: string): string => {
    const { data } = supabase.storage
      .from("resumes")
      .getPublicUrl(filePath);
    
    console.log("Generated public URL:", data.publicUrl);
    return data.publicUrl;
  };

  // Delete a file from storage
  const deleteFile = async (filePath: string): Promise<void> => {
    console.log(`Deleting file from storage: ${filePath}`);
    const { data, error } = await supabase.storage.from("resumes").remove([filePath]);
    
    if (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
    
    console.log("File deleted successfully:", data);
  };

  return {
    ensureStorageBuckets,
    uploadToTempStorage,
    uploadToPermanentStorage,
    getFilePublicUrl,
    deleteFile
  };
};

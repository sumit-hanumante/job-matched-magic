
import { supabase } from "@/lib/supabase";

// Service focused on file storage operations
export const useStorageService = () => {
  // Ensure the required storage buckets exist
  const ensureStorageBuckets = async () => {
    try {
      console.log("Checking storage buckets...");
      
      try {
        // Check if we can access the resumes bucket
        await supabase.storage.getBucket('resumes');
        console.log('Resumes bucket exists');
      } catch (error) {
        if (error instanceof Error && error.message.includes('does not exist')) {
          // Create the buckets if they don't exist
          console.log('Creating resumes bucket...');
          await supabase.storage.createBucket('resumes', {
            public: false,
            fileSizeLimit: 10485760 // 10MB
          });
        } else {
          throw error;
        }
      }
      
      try {
        // Check if we can access the temp-resumes bucket
        await supabase.storage.getBucket('temp-resumes');
        console.log('Temp-resumes bucket exists');
      } catch (error) {
        if (error instanceof Error && error.message.includes('does not exist')) {
          // Create the buckets if they don't exist
          console.log('Creating temp-resumes bucket...');
          await supabase.storage.createBucket('temp-resumes', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
        } else {
          throw error;
        }
      }
      
      console.log('Storage buckets initialized successfully');
    } catch (error) {
      console.error('Error initializing storage buckets:', error);
      throw error;
    }
  };

  // Upload a file to temp storage (for unauthenticated users)
  const uploadToTempStorage = async (file: File): Promise<string> => {
    const tempFileName = `${crypto.randomUUID()}-${file.name}`;
    console.log(`Creating temporary file: ${tempFileName}`);
    
    await ensureStorageBuckets();
    
    const { error: uploadError } = await supabase.storage
      .from("temp-resumes")
      .upload(tempFileName, file);
      
    if (uploadError) {
      console.error("Error uploading temporary file:", uploadError);
      throw uploadError;
    }
    
    console.log("Temporary file uploaded successfully");
    return tempFileName;
  };

  // Upload a file to permanent storage (for authenticated users)
  const uploadToPermanentStorage = async (userId: string, file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    
    await ensureStorageBuckets();
    
    console.log(`Uploading file to storage: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, file);
      
    if (uploadError) {
      console.error("File upload error:", uploadError);
      throw uploadError;
    }
    
    console.log("File uploaded successfully to storage");
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
    await supabase.storage.from("resumes").remove([filePath]);
  };

  return {
    ensureStorageBuckets,
    uploadToTempStorage,
    uploadToPermanentStorage,
    getFilePublicUrl,
    deleteFile
  };
};

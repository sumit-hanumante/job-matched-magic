
import { supabase } from "@/lib/supabase";

// Service focused on file storage operations
export const useStorageService = () => {
  // Ensure the required storage buckets exist
  const ensureStorageBuckets = async () => {
    try {
      console.log("Checking storage buckets...");
      
      // Check and create resumes bucket
      try {
        console.log('Checking if resumes bucket exists...');
        const { data: resumesBucket, error: resumesError } = await supabase.storage.getBucket('resumes');
        
        if (resumesError) {
          if (resumesError.message && resumesError.message.includes('does not exist')) {
            console.log('Creating resumes bucket...');
            const { data: createData, error: createError } = await supabase.storage.createBucket('resumes', {
              public: false,
              fileSizeLimit: 10485760 // 10MB
            });
            
            if (createError) {
              console.error('Failed to create resumes bucket:', createError);
              throw createError;
            }
            console.log('Successfully created resumes bucket:', createData);
          } else {
            console.error('Error checking resumes bucket:', resumesError);
            throw resumesError;
          }
        } else {
          console.log('Resumes bucket exists:', resumesBucket);
        }
      } catch (error: any) {
        // Handle error cases carefully
        if (error.message && error.message.includes('does not exist')) {
          console.log('Creating resumes bucket (caught in catch block)...');
          const { error: createError } = await supabase.storage.createBucket('resumes', {
            public: false,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Failed to create resumes bucket in catch block:', createError);
            throw createError;
          }
          console.log('Successfully created resumes bucket in catch block');
        } else {
          console.error('Unexpected error with resumes bucket:', error);
          throw error;
        }
      }
      
      // Check and create temp-resumes bucket
      try {
        console.log('Checking if temp-resumes bucket exists...');
        const { data: tempBucket, error: tempError } = await supabase.storage.getBucket('temp-resumes');
        
        if (tempError) {
          if (tempError.message && tempError.message.includes('does not exist')) {
            console.log('Creating temp-resumes bucket...');
            const { data: createData, error: createError } = await supabase.storage.createBucket('temp-resumes', {
              public: true,
              fileSizeLimit: 10485760 // 10MB
            });
            
            if (createError) {
              console.error('Failed to create temp-resumes bucket:', createError);
              throw createError;
            }
            console.log('Successfully created temp-resumes bucket:', createData);
          } else {
            console.error('Error checking temp-resumes bucket:', tempError);
            throw tempError;
          }
        } else {
          console.log('Temp-resumes bucket exists:', tempBucket);
        }
      } catch (error: any) {
        // Handle error cases carefully
        if (error.message && error.message.includes('does not exist')) {
          console.log('Creating temp-resumes bucket (caught in catch block)...');
          const { error: createError } = await supabase.storage.createBucket('temp-resumes', {
            public: true,
            fileSizeLimit: 10485760 // 10MB
          });
          
          if (createError) {
            console.error('Failed to create temp-resumes bucket in catch block:', createError);
            throw createError;
          }
          console.log('Successfully created temp-resumes bucket in catch block');
        } else {
          console.error('Unexpected error with temp-resumes bucket:', error);
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
    
    const { data, error: uploadError } = await supabase.storage
      .from("temp-resumes")
      .upload(tempFileName, file);
      
    if (uploadError) {
      console.error("Error uploading temporary file:", uploadError);
      console.error("Error details:", {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
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
        statusCode: uploadError.statusCode,
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

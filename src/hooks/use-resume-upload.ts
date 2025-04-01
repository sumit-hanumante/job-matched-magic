
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTextExtractor } from "./use-document-text-extractor";
import { useStorageService } from "./use-storage-service";
import { useResumeParser } from "./use-resume-parser";
import { useResumeDatabase } from "./use-resume-database";

export const useResumeUpload = (
  user: any,
  onLoginRequired?: (email?: string, fullName?: string) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { extractTextFromFile } = useDocumentTextExtractor();
  const { uploadToTempStorage, uploadToPermanentStorage, getFilePublicUrl, deleteFile } = useStorageService();
  const { parseResumeText } = useResumeParser();
  const { shiftOlderResumes, insertResume } = useResumeDatabase();

  // Main function to upload resume.
  const uploadResume = async (file: File) => {
    if (!file) return false;
    
    try {
      setIsUploading(true);
      console.log("Starting resume upload process...");
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: Math.round(file.size / 1024) + " KB",
      });

      // --- UNAUTHENTICATED FLOW ---
      if (!user) {
        console.log("User not authenticated, performing unauthenticated flow");
        await uploadToTempStorage(file);
        
        if (onLoginRequired) {
          console.log("Prompting user to login/register");
          onLoginRequired();
        }
        
        toast({
          title: "File uploaded successfully",
          description:
            "Please create an account to analyze your resume and get job matches.",
        });
        
        return false;
      }

      // --- AUTHENTICATED FLOW ---
      console.log("Beginning authenticated flow for user ID:", user.id);
      
      // 1. Extract text from the file first, to ensure we can process it
      console.log("Step 1: Extracting text from file");
      const extractedText = await extractTextFromFile(file);
      if (!extractedText || extractedText.length < 10) {
        console.error("Text extraction failed or returned too little text:", extractedText);
        throw new Error("Failed to extract meaningful text from resume");
      }
      console.log(`Text extracted successfully (${extractedText.length} chars)`);
      
      // 2. Shift older resumes to maintain order
      console.log("Step 2: Shifting older resumes");
      await shiftOlderResumes(user.id);
      console.log("Resume shifting completed");
      
      // 3. Upload the file to storage
      console.log("Step 3: Uploading file to storage");
      const filePath = await uploadToPermanentStorage(user.id, file);
      const publicUrl = getFilePublicUrl(filePath);
      
      // 4. Parse the resume with AI
      console.log("Step 4: Parsing resume with AI");
      let parsedData = null;
      try {
        parsedData = await parseResumeText(extractedText);
      } catch (parseError) {
        console.error("Resume parsing failed:", parseError);
        console.log("Proceeding with basic resume data without AI parsing");
      }
      
      // 5. Insert the resume record into the database
      console.log("Step 5: Inserting resume record into database");
      
      // Define the base resume data object with required fields
      const resumeData: Record<string, any> = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        content_type: file.type,
        status: parsedData ? "processed" : "uploaded",
        order_index: 1,
        resume_text: extractedText,
      };

      // Add parsed fields if available
      if (parsedData) {
        console.log("Adding parsed data to resume record");
        
        // Add all available fields from the parsed data
        Object.keys(parsedData).forEach(key => {
          if (key === 'resume_text') return; // Skip resume_text as we already have it
          
          const value = parsedData[key];
          
          // Handle objects that need to be stringified
          if (typeof value === 'object' && key !== 'extracted_skills' && 
              key !== 'preferred_locations' && key !== 'preferred_companies' && 
              key !== 'possible_job_titles') {
            resumeData[key] = JSON.stringify(value);
          } else {
            resumeData[key] = value;
          }
        });
      }

      try {
        const insertedResume = await insertResume(resumeData);
        console.log("Resume upload process completed successfully");
        console.log("Inserted resume data:", insertedResume);
        
        toast({
          title: "Resume uploaded successfully",
          description: parsedData 
            ? "Your resume has been processed and saved."
            : "Your resume has been saved with basic text extraction.",
        });
        
        return true;
      } catch (insertError) {
        console.error("Database insert failed:", insertError);
        console.error("Attempting to clean up storage...");
        await deleteFile(filePath);
        throw insertError;
      }
    } catch (error) {
      console.error("Upload process error:", error);
      console.error("Error details:", error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : String(error));
      
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading your resume",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadResume };
};

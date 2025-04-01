
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTextExtractor } from "./use-document-text-extractor";
import { useStorageService } from "./use-storage-service";
import { useResumeParser } from "./use-resume-parser";
import { useResumeDatabase } from "./use-resume-database";
import { supabase } from "@/lib/supabase";

export const useResumeUpload = (
  user: any,
  onLoginRequired?: (email?: string, fullName?: string) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      setUploadProgress(10);
      console.log("[ResumeUpload] Starting resume upload process...");
      console.log("[ResumeUpload] File details:", {
        name: file.name,
        type: file.type,
        size: Math.round(file.size / 1024) + " KB",
      });

      // --- UNAUTHENTICATED FLOW ---
      if (!user) {
        console.log("[ResumeUpload] User not authenticated, performing unauthenticated flow");
        await uploadToTempStorage(file);
        
        if (onLoginRequired) {
          console.log("[ResumeUpload] Prompting user to login/register");
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
      console.log(`[ResumeUpload] Beginning authenticated flow for user ID: ${user.id}`);
      
      // 1. Extract text from the file first, to ensure we can process it
      console.log("[ResumeUpload] Step 1: Extracting text from file");
      setUploadProgress(20);
      const extractedText = await extractTextFromFile(file);
      if (!extractedText || extractedText.length < 10) {
        console.error("[ResumeUpload] Text extraction failed or returned too little text:", extractedText);
        throw new Error("Failed to extract meaningful text from resume");
      }
      console.log(`[ResumeUpload] Text extracted successfully (${extractedText.length} chars)`);
      setUploadProgress(30);
      
      // 2. Shift older resumes to maintain order
      console.log("[ResumeUpload] Step 2: Shifting older resumes");
      await shiftOlderResumes(user.id);
      console.log("[ResumeUpload] Resume shifting completed");
      setUploadProgress(40);
      
      // 3. Upload the file to storage
      console.log("[ResumeUpload] Step 3: Uploading file to storage");
      const filePath = await uploadToPermanentStorage(user.id, file);
      const publicUrl = getFilePublicUrl(filePath);
      console.log("[ResumeUpload] File uploaded to storage:", publicUrl);
      setUploadProgress(60);
      
      // 4. Parse the resume with AI
      console.log("[ResumeUpload] Step 4: Parsing resume with AI");
      let parsedData = null;
      try {
        // Test the parser functionality first
        console.log("[ResumeUpload] Testing parser function");
        const { data: testData, error: testError } = await supabase.functions.invoke("parse-resume", {
          method: "POST",
          body: { test: true }
        });
        
        if (testError) {
          console.error("[ResumeUpload] Parser test failed:", testError);
          throw new Error(`Parser test failed: ${testError.message}`);
        }
        
        console.log("[ResumeUpload] Parser test response:", testData);
        
        // Now actually parse the resume
        parsedData = await parseResumeText(extractedText);
        console.log("[ResumeUpload] Resume parsed successfully:", {
          hasSkills: parsedData?.extracted_skills?.length > 0,
          skillsCount: parsedData?.extracted_skills?.length || 0,
          hasSummary: !!parsedData?.summary,
        });
      } catch (parseError) {
        console.error("[ResumeUpload] Resume parsing failed:", parseError);
        console.log("[ResumeUpload] Proceeding with basic resume data without AI parsing");
      }
      setUploadProgress(80);
      
      // 5. Insert the resume record into the database
      console.log("[ResumeUpload] Step 5: Inserting resume record into database");
      
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
        console.log("[ResumeUpload] Adding parsed data to resume record");
        
        // Add all available fields from the parsed data
        Object.keys(parsedData).forEach(key => {
          if (key === 'resume_text') return; // Skip resume_text as we already have it
          
          const value = parsedData[key];
          
          // Handle objects that need to be stringified
          if (typeof value === 'object' && value !== null && 
              key !== 'extracted_skills' && 
              key !== 'preferred_locations' && key !== 'preferred_companies' && 
              key !== 'possible_job_titles') {
            resumeData[key] = JSON.stringify(value);
          } else {
            resumeData[key] = value;
          }
        });
        
        console.log("[ResumeUpload] Parsed data keys being added:", Object.keys(parsedData));
      }

      try {
        console.log("[ResumeUpload] Inserting resume with data:", resumeData);
        
        // Direct supabase insert for debugging
        const { data: directData, error: directError } = await supabase
          .from("resumes")
          .insert(resumeData)
          .select();
        
        if (directError) {
          console.error("[ResumeUpload] Direct DB insert failed:", directError);
          throw new Error(`Database insert error: ${directError.message}`);
        }
        
        console.log("[ResumeUpload] Direct DB insert succeeded:", directData);
        
        toast({
          title: "Resume uploaded successfully",
          description: parsedData 
            ? "Your resume has been processed and saved."
            : "Your resume has been saved with basic text extraction.",
        });
        
        setUploadProgress(100);
        return true;
      } catch (insertError) {
        console.error("[ResumeUpload] Database insert failed:", insertError);
        console.error("[ResumeUpload] Attempting to clean up storage...");
        await deleteFile(filePath);
        throw insertError;
      }
    } catch (error) {
      console.error("[ResumeUpload] Upload process error:", error);
      console.error("[ResumeUpload] Error details:", error instanceof Error ? {
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
      setUploadProgress(0);
    }
  };

  return { isUploading, uploadProgress, uploadResume };
};

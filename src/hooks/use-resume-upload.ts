import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentTextExtractor } from "./use-document-text-extractor";
import { useStorageService } from "./use-storage-service";
import { useResumeParser } from "./use-resume-parser";
import { useResumeDatabase } from "./use-resume-database";
import { supabase } from "@/lib/supabase";
import { addResumeEmbedding } from "@/lib/embedding-utils";

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
        
        try {
          await uploadToTempStorage(file);
        } catch (storageError) {
          console.error("[ResumeUpload] Storage error:", storageError);
          if (storageError.message?.includes('row-level security policy')) {
            toast({
              variant: "destructive",
              title: "Storage permission error",
              description: "There was an issue with storage permissions. Please try logging in first.",
            });
          }
        }
        
        if (onLoginRequired) {
          console.log("[ResumeUpload] Prompting user to login/register");
          onLoginRequired();
        }
        
        toast({
          title: "Please create an account",
          description: "Please create an account to analyze your resume and get job matches.",
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
      console.log("[ResumeUpload] Text sample:", extractedText.substring(0, 200));
      setUploadProgress(30);
      
      // 2. Shift older resumes to maintain order
      console.log("[ResumeUpload] Step 2: Shifting older resumes");
      await shiftOlderResumes(user.id);
      console.log("[ResumeUpload] Resume shifting completed");
      setUploadProgress(40);
      
      // 3. Upload the file to storage
      console.log("[ResumeUpload] Step 3: Uploading file to storage");
      let filePath;
      try {
        filePath = await uploadToPermanentStorage(user.id, file);
        const publicUrl = getFilePublicUrl(filePath);
        console.log("[ResumeUpload] File uploaded to storage:", publicUrl);
      } catch (storageError) {
        console.error("[ResumeUpload] Storage upload failed:", storageError);
        filePath = `failed-upload-${Date.now()}-${file.name}`;
        toast({
          variant: "destructive",
          title: "Storage issue",
          description: "Your resume data will be processed, but the original file couldn't be stored.",
        });
      }
      
      setUploadProgress(60);
      
      // 4. Parse the resume with AI
      console.log("[ResumeUpload] Step 4: Testing parser function");
      let parsedData = null;
      try {
        console.log("[ResumeUpload] BEFORE TEST: Invoking parse-resume function with test=true");
        const testResult = await supabase.functions.invoke("parse-resume", {
          method: "POST",
          body: { test: true }
        });
        console.log("[ResumeUpload] AFTER TEST: Received parse-resume test response");
        
        console.log("[ResumeUpload] Parser test response:", testResult);
        
        if (testResult.error) {
          console.error("[ResumeUpload] Parser test failed:", testResult.error);
          toast({
            variant: "destructive",
            title: "Parser test failed",
            description: "Could not connect to resume parser. Basic resume will be uploaded.",
          });
        } else if (testResult.data?.success) {
          console.log("[ResumeUpload] Now parsing resume text with length:", extractedText.length);
          console.log("[ResumeUpload] Text sample for parsing:", extractedText.substring(0, 300));
          
          try {
            console.log("[ResumeUpload] BEFORE GEMINI: Invoking parse-resume function with actual resume text");
            
            const geminiPayload = {
              resumeText: extractedText
            };
            
            console.log("[ResumeUpload] Gemini payload structure:", Object.keys(geminiPayload));
            console.log("[ResumeUpload] Gemini payload resumeText length:", geminiPayload.resumeText.length);
            
            const geminiResponse = await supabase.functions.invoke("parse-resume", {
              method: "POST",
              body: geminiPayload
            });
            
            console.log("[ResumeUpload] AFTER GEMINI: Received parse-resume response");
            console.log("[ResumeUpload] Gemini complete response:", geminiResponse);
            
            if (geminiResponse.error) {
              console.error("[ResumeUpload] Gemini API call failed:", geminiResponse.error);
              throw new Error(`Gemini API call failed: ${geminiResponse.error.message || "Unknown error"}`);
            }
            
            if (!geminiResponse.data?.success) {
              console.error("[ResumeUpload] Gemini API returned failure:", geminiResponse.data);
              throw new Error(`Gemini API returned failure: ${geminiResponse.data?.error || "Unknown error"}`);
            }
            
            parsedData = geminiResponse.data?.data;
            console.log("[ResumeUpload] Successfully parsed resume data from Gemini:", parsedData);
            
            if (parsedData?.extracted_skills?.length > 0) {
              console.log("[ResumeUpload] Extracted skills:", parsedData.extracted_skills);
            } else {
              console.warn("[ResumeUpload] No skills were extracted from the resume");
            }
            
          } catch (geminiError) {
            console.error("[ResumeUpload] Error in Gemini call:", geminiError);
            console.error("[ResumeUpload] Error details:", geminiError instanceof Error ? geminiError.stack : String(geminiError));
            throw geminiError;
          }
        } else {
          console.error("[ResumeUpload] Parser test returned unexpected format:", testResult);
          toast({
            variant: "destructive",
            title: "Parser test issue",
            description: "Resume parser returned an unexpected response. Basic resume will be uploaded.",
          });
        }
      } catch (parseError) {
        console.error("[ResumeUpload] Resume parsing failed:", parseError);
        console.log("[ResumeUpload] Proceeding with basic resume data without AI parsing");
        toast({
          variant: "destructive",
          title: "AI parsing failed",
          description: "Your resume was uploaded but couldn't be automatically analyzed.",
        });
      }
      setUploadProgress(80);
      
      // 5. Insert the resume record into the database
      console.log("[ResumeUpload] Step 5: Inserting resume record into database");
      
      // Define the base resume data object with required fields
      const resumeData: Record<string, any> = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath || 'unknown-path',
        content_type: file.type,
        status: parsedData ? "processed" : "uploaded",
        order_index: 1,
        resume_text: extractedText,
      };

      // Add parsed fields if available
      if (parsedData) {
        console.log("[ResumeUpload] Adding parsed data to resume record");
        
        Object.keys(parsedData).forEach(key => {
          if (key === 'resume_text') return;
          
          const value = parsedData[key];
          
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
        console.log("[ResumeUpload] Inserting resume with data:", {
          ...resumeData,
          resume_text: `${resumeData.resume_text?.substring(0, 100)}... (truncated)`
        });
        
        console.log("[ResumeUpload] BEFORE DB INSERT: Executing direct DB insert...");
        const { data: directData, error: directError } = await supabase
          .from("resumes")
          .insert(resumeData)
          .select();
        
        console.log("[ResumeUpload] AFTER DB INSERT: Insert completed");
        
        if (directError) {
          console.error("[ResumeUpload] Direct DB insert failed:", directError);
          throw new Error(`Database insert error: ${directError.message}`);
        }
        
        console.log("[ResumeUpload] Direct DB insert succeeded:", directData);
        
        if (directData && directData[0] && directData[0].id && resumeData.resume_text) {
          console.log("[ResumeUpload] Starting embedding generation for resume text...");
          await addResumeEmbedding(
            resumeData.resume_text, 
            user.id,
            directData[0].id
          );
        }
        
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
        if (filePath) {
          console.error("[ResumeUpload] Attempting to clean up storage...");
          try {
            await deleteFile(filePath);
          } catch (cleanupError) {
            console.error("[ResumeUpload] Storage cleanup failed:", cleanupError);
          }
        }
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

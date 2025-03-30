
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";
import * as pdfjsLib from "pdfjs-dist";

// Dynamically determine the proper worker URL based on the PDF.js version
// This approach prevents version mismatches between the API and worker
const pdfVersion = pdfjsLib.version || "2.16.105";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfVersion}/pdf.worker.min.js`;

export const useResumeUpload = (
  user: any,
  onLoginRequired?: (email?: string, fullName?: string) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Function to extract clean text from a PDF using pdfjs-dist.
  const extractCleanTextFromPDF = async (file: File): Promise<string> => {
    try {
      console.log("Starting PDF text extraction");
      const arrayBuffer = await file.arrayBuffer();
      console.log(`PDF buffer created, size: ${arrayBuffer.byteLength} bytes`);
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      console.log("PDF loading task created");
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully, pages: ${pdf.numPages}`);
      
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Join text items from the page.
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
        console.log(`Page ${pageNum} extracted, text length: ${pageText.length}`);
      }
      
      console.log(`PDF extraction complete, total text length: ${fullText.length}`);
      return fullText.trim();
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Extract text from DOCX (using file.text() as fallback)
  const extractTextFromFile = async (file: File): Promise<string> => {
    console.log(`Extracting text from ${file.name} (${file.type})`);
    console.log(`File size: ${file.size} bytes`);
    
    try {
      if (file.type === "application/pdf") {
        console.log("Using PDF extraction method");
        const text = await extractCleanTextFromPDF(file);
        console.log(`PDF extraction successful, text length: ${text.length}`);
        return text;
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.log("Using DOCX extraction method (file.text())");
        const text = await file.text();
        console.log(`DOCX text extracted, length: ${text.length}`);
        return text;
      } else {
        console.error("Unsupported file type:", file.type);
        throw new Error("Unsupported file type: " + file.type);
      }
    } catch (error) {
      console.error("Text extraction failed:", error);
      console.error("Falling back to simple file.text() method");
      
      // Last resort: try to get the raw text
      try {
        const rawText = await file.text();
        console.log(`Fallback text extraction method returned ${rawText.length} characters`);
        return rawText;
      } catch (fallbackError) {
        console.error("Even fallback extraction failed:", fallbackError);
        throw new Error("Could not extract text from file using any available method");
      }
    }
  };

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
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        console.log(`Creating temporary file: ${tempFileName}`);
        
        const { error: uploadError, data } = await supabase.storage
          .from("temp-resumes")
          .upload(tempFileName, file);
          
        if (uploadError) {
          console.error("Error uploading temporary file:", uploadError);
          throw uploadError;
        }
        
        console.log("Temporary file uploaded successfully");
        
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
      await shiftResumes(user.id);
      console.log("Resume shifting completed");
      
      // 3. Upload the file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log(`Step 3: Uploading file to storage: ${filePath}`);
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);
        
      if (uploadError) {
        console.error("File upload error:", uploadError);
        throw uploadError;
      }
      console.log("File uploaded successfully to storage");

      // 4. Get the public URL (for metadata/reference)
      console.log("Step 4: Generating public URL");
      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);
        
      console.log("Generated public URL:", urlData.publicUrl);

      // 5. Call the edge function with the extracted text
      console.log("Step 5: Sending extracted text to parse-resume function...");
      console.log(`Sending ${extractedText.length} characters of text`);
      
      let parsedData = null;
      try {
        console.log("Calling edge function with full request body:", {
          resumeText: extractedText.substring(0, 100) + "..." // Log just the start for brevity
        });
        
        const { data: responseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
          method: "POST",
          body: { resumeText: extractedText },
        });
        
        if (parseError) {
          console.error("Edge function error details:", {
            name: parseError.name,
            message: parseError.message,
            code: parseError.code,
            stack: parseError.stack,
          });
          throw parseError;
        }
        
        console.log("Edge function response received:", responseData ? Object.keys(responseData) : "No data");
        
        if (!responseData?.success) {
          const errorMsg = responseData?.error || "Failed to parse resume";
          console.error("Edge function execution failed:", errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log("Resume parsed successfully");
        if (responseData.data) {
          console.log("Parsed data keys:", Object.keys(responseData.data));
          parsedData = responseData.data;
        } else {
          console.warn("No data returned from parse function");
        }
      } catch (invocationError) {
        console.error("Edge function invocation error:", invocationError);
        console.error("Error type:", typeof invocationError);
        console.error("Error details:", JSON.stringify(invocationError, null, 2));
        
        // Fall back to just saving the extracted text without parsing
        console.log("Falling back to saving raw text without AI parsing");
      }
      
      // 6. Insert the resume record into the database
      console.log("Step 6: Inserting resume record into database...");
      
      const resumeData = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        content_type: file.type,
        status: parsedData ? "processed" : "uploaded",
        order_index: 1,
        resume_text: extractedText, // Store the full extracted text
      };

      // Add parsed fields if available
      if (parsedData) {
        Object.assign(resumeData, {
          extracted_skills: parsedData.extracted_skills || [],
          experience: parsedData.experience || "",
          preferred_locations: parsedData.preferred_locations || [],
          preferred_companies: parsedData.preferred_companies || [],
          min_salary: parsedData.min_salary || null,
          max_salary: parsedData.max_salary || null,
          preferred_work_type: parsedData.preferred_work_type || null,
          total_years_experience: parsedData.total_years_experience || null,
          possible_job_titles: parsedData.possible_job_titles || []
        });
      }
      
      const { error: insertError } = await supabase
        .from("resumes")
        .insert(resumeData);
        
      if (insertError) {
        console.error("Database insert failed:", insertError);
        console.error("Attempting to clean up storage...");
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError;
      }

      console.log("Resume upload process completed successfully");
      toast({
        title: "Resume uploaded successfully",
        description: parsedData 
          ? "Your resume has been processed and saved."
          : "Your resume has been saved with basic text extraction.",
      });
      
      return true;
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

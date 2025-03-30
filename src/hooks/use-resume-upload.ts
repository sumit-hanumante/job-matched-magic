
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
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`PDF loaded, pages: ${pdf.numPages}`);
      
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // Join text items from the page.
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      
      console.log(`PDF extraction complete, text length: ${fullText.length}`);
      return fullText.trim();
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Fallback extraction for DOCX (naively using file.text())
  const extractTextFromFile = async (file: File): Promise<string> => {
    console.log(`Extracting text from ${file.name} (${file.type})`);
    
    try {
      if (file.type === "application/pdf") {
        return await extractCleanTextFromPDF(file);
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const text = await file.text();
        console.log(`DOCX text extracted, length: ${text.length}`);
        return text;
      } else {
        throw new Error("Unsupported file type: " + file.type);
      }
    } catch (error) {
      console.error("Text extraction failed:", error);
      throw error;
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
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("temp-resumes")
          .upload(tempFileName, file);
          
        if (uploadError) throw uploadError;
        
        if (onLoginRequired) onLoginRequired();
        
        toast({
          title: "File uploaded successfully",
          description:
            "Please create an account to analyze your resume and get job matches.",
        });
        
        return false;
      }

      // --- AUTHENTICATED FLOW ---
      // 1. Upload the file to storage.
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      
      console.log(`Uploading file to storage: ${filePath}`);
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      console.log("File uploaded successfully to storage");

      // 2. Extract text from the file.
      console.log("Extracting text from file...");
      const extractedText = await extractTextFromFile(file);
      console.log(`Text extracted successfully (${extractedText.length} chars)`);

      // 3. Get the public URL (for metadata/reference).
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);
        
      console.log("Generated public URL:", publicUrl);
      
      if (!publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      // 4. Invoke the edge function with the extracted text
      console.log("Sending extracted text to parse-resume function...");
      const { data, error: parseError } = await supabase.functions.invoke("parse-resume", {
        body: { resumeText: extractedText },
      });
      
      if (parseError) {
        console.error("Parse-resume function error:", parseError);
        throw parseError;
      }
      
      if (!data?.success) {
        const errorMsg = data?.error || "Failed to parse resume";
        console.error("Parse-resume function failed:", errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log("Resume parsed successfully");

      // 5. Shift older resumes
      await shiftResumes(user.id);

      // 6. Insert the resume record into the database.
      console.log("Inserting resume record into database...");
      const parsedData = data.data || {};
      
      const { error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: "processed",
          order_index: 1,
          extracted_skills: parsedData.extracted_skills || [],
          experience: parsedData.experience || "",
          preferred_locations: parsedData.preferred_locations || [],
          preferred_companies: parsedData.preferred_companies || [],
          min_salary: parsedData.min_salary || null,
          max_salary: parsedData.max_salary || null,
          preferred_work_type: parsedData.preferred_work_type || null,
          resume_text: extractedText, // Store the full extracted text
          public_url: publicUrl,
        });
        
      if (insertError) {
        console.error("Database insert failed:", insertError);
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError;
      }

      console.log("Resume upload process completed successfully");
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been processed and saved.",
      });
      
      return true;
    } catch (error) {
      console.error("Upload process error:", error);
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

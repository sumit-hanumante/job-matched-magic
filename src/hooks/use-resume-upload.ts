import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";
import * as pdfjsLib from "pdfjs-dist";

// Update the worker source to match the API version
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

export const useResumeUpload = (
  user: any,
  onLoginRequired?: (email?: string, fullName?: string) => void
) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  // Function to extract clean text from a PDF using pdfjs-dist.
  const extractCleanTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        // Join text items from the page.
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      console.log("Extracted PDF text length:", fullText.length);
      return fullText.trim();
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      throw error;
    }
  };

  // Fallback extraction for DOCX (naively using file.text())
  const extractTextFromFile = async (file: File): Promise<string> => {
    if (file.type === "application/pdf") {
      return extractCleanTextFromPDF(file);
    } else if (
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const text = await file.text();
      console.log("Extracted DOCX text length:", text.length);
      return text;
    } else {
      throw new Error("Unsupported file type: " + file.type);
    }
  };

  // Main function to upload resume.
  const uploadResume = async (file: File) => {
    if (!file) return;
    try {
      setIsUploading(true);
      console.log("Starting resume upload process...");
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: file.size + " bytes",
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
        return;
      }

      // --- AUTHENTICATED FLOW ---
      // 1. Upload the file to storage.
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      console.log("Uploading file to storage:", filePath);
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      console.log("File uploaded successfully to storage");

      // 2. Extract text from the file.
      const extractedText = await extractTextFromFile(file);
      console.log("Extracted text (first 300 chars):", extractedText.substring(0, 300));

      // 3. Get the public URL (for metadata/reference).
      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);
      console.log("Generated public URL:", publicUrl);
      if (!publicUrl) {
        throw new Error("Failed to generate public URL");
      }

      // 4. Invoke the edge function (parse-resume) with the extracted text.
      console.log("Invoking parse-resume function with resumeText...");
      const { data, error: parseError } = await supabase.functions.invoke("parse-resume", {
        body: { resumeText: extractedText },
      });
      if (parseError) throw parseError;
      console.log("parse-resume response =>", data);
      if (!data?.success) {
        throw new Error(data?.error || "Failed to parse resume");
      }

      // 5. Shift older resumes (if needed).
      await shiftResumes(user.id);

      // 6. Insert the resume record into the database.
      console.log("Inserting resume record into database...");
      const { error: insertError } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: "processed",
          order_index: 1,
          extracted_skills: data.data?.skills || [],
          experience: data.data?.experience || "",
          preferred_locations: data.data?.preferredLocations || [],
          preferred_companies: data.data?.preferredCompanies || [],
          // Optionally store the extracted text and public URL for future reference.
          resume_text: extractedText,
          public_url: publicUrl,
        })
        .single();
      if (insertError) {
        console.error("Database insert failed:", insertError);
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError;
      }

      console.log("Resume upload process completed successfully");
      toast({
        title: "Resume uploaded successfully",
        description: data.data
          ? "Your resume has been processed and saved."
          : "Your resume has been uploaded. We'll process it shortly.",
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

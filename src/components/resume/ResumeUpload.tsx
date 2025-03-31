
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./ResumeDisplay";
import ResumeDropzone from "./ResumeDropzone";
import ResumeUploadForm from "./ResumeUploadForm";

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [currentResume, setCurrentResume] = useState<{
    filename?: string;
    status?: string;
    uploaded_at?: string;
    id?: string;
    file_path?: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCurrentResume();
    }
  }, [user]);

  const fetchCurrentResume = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("id, file_name, status, created_at, file_path")
        .eq("user_id", user.id)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching resume:", error);
        return;
      }

      if (data) {
        setCurrentResume({
          id: data.id,
          filename: data.file_name,
          status: data.status,
          uploaded_at: data.created_at,
          file_path: data.file_path
        });
      } else {
        setCurrentResume(null);
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (selectedFile?: File) => {
    if (
      selectedFile &&
      (selectedFile.type === "application/pdf" ||
        selectedFile.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setFile(selectedFile);
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
      });
    }
  };

  const shiftResumes = async (userId: string) => {
    try {
      const { data: resumes, error: fetchError } = await supabase
        .from("resumes")
        .select("id, order_index")
        .eq("user_id", userId)
        .order("order_index", { ascending: true });

      if (fetchError) throw fetchError;

      if (resumes) {
        for (const resume of resumes) {
          const newIndex = resume.order_index + 1;
          if (newIndex <= 3) {
            await supabase
              .from("resumes")
              .update({ order_index: newIndex })
              .eq("id", resume.id);
          } else {
            await supabase.from("resumes").delete().eq("id", resume.id);
          }
        }
      }
    } catch (error) {
      console.error("Error shifting resumes:", error);
      throw error;
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    setUploadStatus("Extracting text from PDF...");
    
    try {
      // Use PDF.js to extract text
      const { getDocument } = await import('pdfjs-dist');
      const fileReader = new FileReader();
      
      return new Promise((resolve, reject) => {
        fileReader.onload = async (event) => {
          try {
            const typedarray = new Uint8Array(event.target?.result as ArrayBuffer);
            const loadingTask = getDocument({ data: typedarray });
            const pdf = await loadingTask.promise;
            
            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map((item: any) => item.str).join(' ');
              fullText += pageText + '\n';
            }
            
            resolve(fullText);
          } catch (err) {
            reject(err);
          }
        };
        
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
      });
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const uploadResume = async () => {
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus("Starting resume upload and processing...");
    console.log("Starting resume upload and processing...");

    try {
      if (!user) {
        setUploadStatus("No user found, uploading to temporary storage...");
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from("temp-resumes")
          .upload(tempFileName, file);

        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from("temp-resumes")
          .getPublicUrl(data.path);

        if (onLoginRequired) onLoginRequired();

        toast({
          title: "File uploaded successfully",
          description:
            "Please create an account to analyze your resume and get job matches.",
        });

        resetFileInput();
        return;
      }

      // Shift existing resumes to make room for the new one
      setUploadStatus("Preparing database for new resume...");
      await shiftResumes(user.id);

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      setUploadStatus("Uploading file to storage...");
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log(`File uploaded to: ${filePath}`);

      // Extract text from PDF/DOCX
      let resumeText;
      if (file.type === "application/pdf") {
        resumeText = await extractTextFromPdf(file);
        console.log("Extracted text from PDF, length:", resumeText.length);
      } else {
        // For now, we'll handle DOCX files later
        resumeText = "Document text extraction not implemented for this file type.";
      }

      // Create initial database entry
      setUploadStatus("Creating database entry...");
      const { error: insertError, data: resumeData } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: "uploaded",
          order_index: 1,
          resume_text: resumeText || ""
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError;
      }

      // Call Gemini for parsing
      setUploadStatus("Analyzing resume with AI...");
      console.log("Sending text to parse-resume function, length:", resumeText?.length || 0);

      const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        body: JSON.stringify({ resumeText: resumeText }),
        headers: { "Content-Type": "application/json" },
      });

      if (parseError) {
        throw parseError;
      }

      if (!parseData.success) {
        throw new Error(parseData.error || "Failed to parse resume");
      }

      console.log("Parse response data:", parseData.data);
      setUploadStatus("AI analysis complete, saving results...");

      // Update the resume record with parsed data
      const parsedFields = {
        status: "parsed",
        extracted_skills: parseData.data.extracted_skills,
        summary: parseData.data.summary,
        experience: parseData.data.experience,
        education: parseData.data.education,
        projects: parseData.data.projects,
        preferred_locations: parseData.data.preferred_locations,
        preferred_companies: parseData.data.preferred_companies,
        min_salary: parseData.data.min_salary,
        max_salary: parseData.data.max_salary,
        preferred_work_type: parseData.data.preferred_work_type,
        years_of_experience: parseData.data.years_of_experience,
        possible_job_titles: parseData.data.possible_job_titles,
        personal_information: parseData.data.personal_information,
      };

      console.log("Updating resume with parsed fields:", parsedFields);

      const { error: updateError } = await supabase
        .from("resumes")
        .update(parsedFields)
        .eq("id", resumeData.id);

      if (updateError) {
        console.error("Error updating resume with parsed data:", updateError);
        throw updateError;
      }

      toast({
        title: "Resume processed",
        description: "Your resume has been analyzed and your profile is ready.",
      });

      resetFileInput();
      await fetchCurrentResume();
    } catch (error) {
      console.error("Error during upload/parsing:", error);
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        variant: "destructive",
        title: "Processing failed",
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFileInput = () => {
    setFile(null);
    setUploadStatus("");
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleCancel = () => {
    resetFileInput();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {currentResume && (
        <ResumeDisplay
          filename={currentResume.filename || ""}
          uploadedAt={currentResume.uploaded_at || ""}
          status={currentResume.status || ""}
          onUpdateClick={() => {
            const fileInput = document.getElementById(
              "file-upload"
            ) as HTMLInputElement;
            if (fileInput) fileInput.click();
          }}
        />
      )}

      <ResumeDropzone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileInput}
        hasExistingResume={!!currentResume}
        isAuthenticated={!!user}
      />

      {file && (
        <ResumeUploadForm
          file={file}
          isUploading={isProcessing}
          onUpload={uploadResume}
          onCancel={handleCancel}
          isAuthenticated={!!user}
          uploadStatus={uploadStatus}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

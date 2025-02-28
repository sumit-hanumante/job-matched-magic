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
  const [currentResume, setCurrentResume] = useState<{
    filename?: string;
    status?: string;
    uploaded_at?: string;
    id?: string;
    file_path?: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch the latest resume on user login
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
        // Update local state with parsed data
        setCurrentResume(prev => ({
          ...prev,
          status: 'parsed',
          // parsedData // Add this to your state interface if needed
        }));
      } else {
        setCurrentResume(null);
      }
    } catch (error) {
      console.error("Error fetching resume:", error);
    }
  };

  // Handle drag-and-drop events
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

  // Shift existing resumes to maintain a maximum of 3
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

  // Upload and process the resume
  const uploadResume = async () => {
    if (!file) return;

    setIsProcessing(true);
    console.log("Starting resume upload and processing...");

    try {
      if (!user) {
        // Handle unauthenticated upload
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

      // Authenticated user flow
      console.log("Uploading resume for authenticated user...");
      await shiftResumes(user.id);

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      console.log(`File uploaded to: ${filePath}`);

      // Insert resume metadata into database
      const { error: insertError, data: resumeData } = await supabase
        .from("resumes")
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: "uploaded",
          order_index: 1,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from("resumes").remove([filePath]);
        throw insertError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

        console.log("Generated public URL:", publicUrl); // Add this line

      toast({
        title: "Resume uploaded",
        description: "Analyzing your resume...",
      });

      // Invoke server-side parsing
      console.log("Invoking parse-resume function with URL:", publicUrl);
      console.log("Public URL being sent:", publicUrl);
if (!publicUrl) {
  console.error("Public URL is empty! Check your Supabase storage configuration.");
  toast({
    variant: "destructive",
    title: "Upload Failed",
    description: "The public URL could not be generated. Please check your Supabase storage settings.",
  });
  setIsProcessing(false);
  return; // Stop the upload process
}

const { data: parseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
  method: "POST",
  body: JSON.stringify({ resumeUrl: publicUrl }),
  headers: { "Content-Type": "application/json" },
});

      
      
      
      if (parseError) {
        throw parseError;
      }

      console.log("Parse response:", parseData);
      

      if (!parseData.success) {
        throw new Error(parseData.error || "Failed to parse resume");
      }
      // Store parsed data in local state instead of DB
      const parsedData = parseData.data;
      toast({
        title: "Resume analyzed successfully",
        description: "Your resume has been processed!",
      });

      // Update resume status
      await supabase
        .from("resumes")
        .update({ status: "parsed" })
        .eq("id", resumeData.id);

      toast({
        title: "Resume analyzed",
        description: "Your resume has been processed successfully.",
      });

      resetFileInput();
      await fetchCurrentResume();
    } catch (error) {
      console.error("Error during upload/parsing:", error);
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
    const fileInput = document.getElementById("file-upload") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
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
          isAuthenticated={!!user}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

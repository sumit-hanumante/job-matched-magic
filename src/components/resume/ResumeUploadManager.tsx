
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./ResumeDisplay";
import ResumeDropzone from "./ResumeDropzone";
import ResumeUploadForm from "./ResumeUploadForm";
import { useResumeService } from "@/hooks/resume/use-resume-service";
import { useResumeUpload } from "@/hooks/use-resume-upload";

interface ResumeUploadManagerProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUploadManager = ({ onLoginRequired }: ResumeUploadManagerProps) => {
  const [isDragging, setIsDragging] = useState(false);
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
  const { fetchCurrentResume } = useResumeService();
  const { isUploading, uploadResume } = useResumeUpload(user, onLoginRequired);

  useEffect(() => {
    if (user) {
      loadCurrentResume();
    }
  }, [user]);

  const loadCurrentResume = async () => {
    if (!user) return;

    try {
      const resume = await fetchCurrentResume(user.id);
      setCurrentResume(resume);
    } catch (error) {
      console.error("Failed to load current resume:", error);
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
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setFile(selectedFile);
    } else if (selectedFile) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
      });
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("");
    
    const success = await uploadResume(file);
    if (success) {
      resetFileInput();
      toast({
        title: "Resume processed",
        description: "Your resume has been analyzed and your profile is ready.",
      });
      await loadCurrentResume();
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
          isUploading={isUploading}
          onUpload={handleUpload}
          onCancel={handleCancel}
          isAuthenticated={!!user}
          uploadStatus={uploadStatus}
        />
      )}
    </div>
  );
};

export default ResumeUploadManager;

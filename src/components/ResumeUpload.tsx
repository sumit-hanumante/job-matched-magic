
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";
import { useResumeUpload } from "@/hooks/use-resume-upload";
import { fetchCurrentResume } from "@/lib/resume-utils";
import { useJobMatching } from '@/hooks/use-job-matching';

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [currentResume, setCurrentResume] = useState<{
    filename?: string;
    status?: string;
    uploaded_at?: string;
    id?: string;
    file_path?: string;
    is_primary?: boolean;
  } | null>(null);
  
  const { user } = useAuth();
  const { isUploading, uploadResume } = useResumeUpload(user, onLoginRequired);
  const { isProcessing, generateJobMatches } = useJobMatching();

  // Load the current resume when the component mounts or when the user changes
  useEffect(() => {
    if (user) {
      loadCurrentResume();
    }
  }, [user]);

  const loadCurrentResume = async () => {
    if (user) {
      const resume = await fetchCurrentResume(user.id);
      setCurrentResume(resume);
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
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === "application/pdf" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    const success = await uploadResume(file);
    if (success) {
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Reload the current resume after successful upload
      await loadCurrentResume();
      
      // Generate job matches if we have a resume ID
      const updatedResume = await fetchCurrentResume(user?.id || '');
      if (updatedResume?.id) {
        generateJobMatches(updatedResume.id);
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {currentResume && (
        <ResumeDisplay
          filename={currentResume.filename || ''}
          uploadedAt={currentResume.uploaded_at || ''}
          status={currentResume.status || ''}
          onUpdateClick={() => {
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.click();
          }}
          isPrimary={currentResume.is_primary}
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
          isAuthenticated={!!user}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

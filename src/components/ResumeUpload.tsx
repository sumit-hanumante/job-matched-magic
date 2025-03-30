
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";
import ResumeFileHandler from "./resume/ResumeFileHandler";
import ResumeUploadProgress from "./resume/ResumeUploadProgress";
import ResumeCleanupButton from "./resume/ResumeCleanupButton";
import { useResumeUpload } from "@/hooks/use-resume-upload";
import { useResumeState } from "@/hooks/use-resume-state";
import { useJobMatching } from '@/hooks/use-job-matching';
import { useUploadProgress } from "@/hooks/use-upload-progress";
import { useConsoleCapture } from "@/hooks/use-console-capture";

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  
  const { user } = useAuth();
  const { currentResume, fetchCurrentResume } = useResumeState(user?.id);
  const { isUploading, uploadResume } = useResumeUpload(user, onLoginRequired);
  const { isProcessing, generateJobMatches } = useJobMatching();
  const { uploadProgress } = useUploadProgress(isUploading);
  const { errorDetails, resetErrorDetails } = useConsoleCapture(isUploading, () => {});

  // Reset error when file changes or upload starts
  useEffect(() => {
    if (file || isUploading) {
      resetErrorDetails();
    }
  }, [file, isUploading]);

  const handleUpload = async () => {
    if (!file) return;
    
    // Reset status
    setUploadStatus("");
    
    const success = await uploadResume(file);
    if (success) {
      setFile(null);
      
      // Reload the current resume after successful upload
      await fetchCurrentResume();
      
      // Generate job matches if we have a resume ID
      if (currentResume?.id) {
        generateJobMatches(currentResume.id);
      }
    }
  };

  const handleCancel = () => {
    setFile(null);
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleCleanupComplete = () => {
    fetchCurrentResume();
  };

  return (
    <div className="w-full">
      <ResumeUploadProgress 
        isUploading={isUploading} 
        progress={uploadProgress} 
        errorDetails={errorDetails} 
      />
      
      {currentResume && (
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <ResumeDisplay
            filename={currentResume.filename || ''}
            uploadedAt={currentResume.uploaded_at || ''}
            status={currentResume.status || ''}
            onUpdateClick={() => {
              const fileInput = document.getElementById('file-upload') as HTMLInputElement;
              if (fileInput) fileInput.click();
            }}
            isPrimary={currentResume.is_primary}
            totalYearsExperience={currentResume.total_years_experience}
            possibleJobTitles={currentResume.possible_job_titles}
          />
          
          {user && (
            <ResumeCleanupButton 
              userId={user.id} 
              onCleanupComplete={handleCleanupComplete} 
            />
          )}
        </div>
      )}

      {!file ? (
        <ResumeFileHandler onFileSelected={handleFileSelected}>
          {({ isDragging, handleDragOver, handleDragLeave, handleDrop, handleFileInput }) => (
            <ResumeDropzone
              isDragging={isDragging}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileSelect={handleFileInput}
              hasExistingResume={!!currentResume}
              isAuthenticated={!!user}
            />
          )}
        </ResumeFileHandler>
      ) : (
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

export default ResumeUpload;

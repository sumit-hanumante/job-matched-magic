
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";
import { useResumeUpload } from "@/hooks/use-resume-upload";
import { fetchCurrentResume, cleanupAllResumes } from "@/lib/resume-utils";
import { useJobMatching } from '@/hooks/use-job-matching';
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";
import ResumeFileHandler from "./resume/ResumeFileHandler";
import ResumeUploadProgress from "./resume/ResumeUploadProgress";
import ResumeCleanupButton from "./resume/ResumeCleanupButton";
import { useUploadProgress } from "@/hooks/use-upload-progress";
import { useConsoleCapture } from "@/hooks/use-console-capture";

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
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
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { uploadProgress } = useUploadProgress(isUploading);
  const { capturedOutput } = useConsoleCapture(isUploading, (error) => setErrorDetails(error));

  // Load the current resume when the component mounts or when the user changes
  useEffect(() => {
    if (user) {
      loadCurrentResume();
    }
  }, [user]);

  // Reset error when file changes or upload starts
  useEffect(() => {
    if (file || isUploading) {
      setErrorDetails(null);
    }
  }, [file, isUploading]);

  const loadCurrentResume = async () => {
    if (user) {
      try {
        const resume = await fetchCurrentResume(user.id);
        setCurrentResume(resume);
      } catch (error) {
        console.error("Failed to load current resume:", error);
        toast({
          variant: "destructive",
          title: "Failed to load resume",
          description: "Could not retrieve your current resume"
        });
      }
    }
  };

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    
    // Reset status and errors
    setUploadStatus("");
    setErrorDetails(null);
    
    const success = await uploadResume(file);
    if (success) {
      setFile(null);
      
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been processed and saved.",
      });
      
      // Reload the current resume after successful upload
      await loadCurrentResume();
      
      // Generate job matches if we have a resume ID
      const updatedResume = await fetchCurrentResume(user?.id || '');
      if (updatedResume?.id) {
        generateJobMatches(updatedResume.id);
      }
    }
  };

  const handleCleanupResumes = async () => {
    if (!user) return;
    
    setIsCleaningUp(true);
    try {
      const success = await cleanupAllResumes(user.id);
      if (success) {
        toast({
          title: "Cleanup successful",
          description: "All your resumes have been removed.",
        });
        setCurrentResume(null);
      } else {
        toast({
          variant: "destructive",
          title: "Cleanup failed",
          description: "Failed to clean up resumes. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsCleaningUp(false);
    }
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
          />
          
          <div className="mt-4 flex justify-end">
            <Button 
              variant="destructive" 
              size={isMobile ? "sm" : "default"}
              onClick={handleCleanupResumes}
              disabled={isCleaningUp}
              className="flex items-center gap-2 h-9 text-xs sm:text-sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isCleaningUp ? 'Cleaning...' : 'Remove All Resumes'}
            </Button>
          </div>
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
          onCancel={() => setFile(null)}
          isAuthenticated={!!user}
          uploadStatus={uploadStatus}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

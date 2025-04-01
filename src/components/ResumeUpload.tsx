
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";
import { useResumeUpload } from "@/hooks/use-resume-upload";
import { fetchCurrentResume, cleanupAllResumes } from "@/lib/resume-utils";
import { useJobMatching } from '@/hooks/use-job-matching';
import { Button } from "@/components/ui/button";
import { Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
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
  const { isUploading, uploadProgress, uploadResume } = useResumeUpload(user, onLoginRequired);
  const { isProcessing, generateJobMatches } = useJobMatching();
  const { toast } = useToast();
  const isMobile = useIsMobile();

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
        console.log("[ResumeUpload] Loading current resume for user:", user.id);
        const resume = await fetchCurrentResume(user.id);
        console.log("[ResumeUpload] Current resume loaded:", resume);
        setCurrentResume(resume);
      } catch (error) {
        console.error("[ResumeUpload] Failed to load current resume:", error);
        toast({
          variant: "destructive",
          title: "Failed to load resume",
          description: "Could not retrieve your current resume"
        });
      }
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
    } else {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a PDF or Word document"
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && (selectedFile.type === "application/pdf" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(selectedFile);
      // Clean up the input value to allow selecting the same file again
      e.target.value = '';
    } else if (selectedFile) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a PDF or Word document"
      });
      e.target.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    // Reset status and errors
    setErrorDetails(null);
    
    console.log("[ResumeUpload] Starting upload for file:", file.name);
    const success = await uploadResume(file);
    
    if (success) {
      console.log("[ResumeUpload] Upload successful, resetting file input");
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been processed and saved.",
      });
      
      // Reload the current resume after successful upload
      console.log("[ResumeUpload] Reloading current resume");
      await loadCurrentResume();
      
      // Generate job matches if we have a resume ID
      console.log("[ResumeUpload] Checking for resume ID to generate matches");
      const updatedResume = await fetchCurrentResume(user?.id || '');
      if (updatedResume?.id) {
        console.log("[ResumeUpload] Generating job matches for resume:", updatedResume.id);
        generateJobMatches(updatedResume.id);
      }
    } else {
      console.log("[ResumeUpload] Upload failed");
    }
  };

  const handleCleanupResumes = async () => {
    if (!user) return;
    
    setIsCleaningUp(true);
    try {
      console.log("[ResumeUpload] Cleaning up all resumes for user:", user.id);
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
      {isUploading && uploadProgress > 0 && (
        <div className="mb-4 space-y-2 animate-fade-in">
          <div className="flex justify-between items-center text-sm text-slate-600 mb-1">
            <span>Uploading resume...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
      
      {errorDetails && !isUploading && (
        <div className="p-4 mb-4 border border-red-200 bg-red-50 rounded-lg text-red-700 text-sm flex items-start gap-3 animate-slide-up">
          <FileText className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Upload failed</h4>
            <p className="text-sm">{errorDetails}</p>
            <p className="mt-2 text-sm">
              Please try again or contact support if the issue persists.
            </p>
          </div>
        </div>
      )}

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
        <ResumeDropzone
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileInput}
          hasExistingResume={!!currentResume}
          isAuthenticated={!!user}
        />
      ) : (
        <ResumeUploadForm
          file={file}
          isUploading={isUploading}
          onUpload={handleUpload}
          onCancel={() => setFile(null)}
          isAuthenticated={!!user}
          uploadStatus=""
        />
      )}
    </div>
  );
};

export default ResumeUpload;

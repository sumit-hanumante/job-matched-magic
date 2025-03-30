
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

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  // Simulate upload progress
  useEffect(() => {
    let intervalId: number;
    
    if (isUploading) {
      setUploadProgress(0);
      intervalId = window.setInterval(() => {
        setUploadProgress(prev => {
          // Go up to 90%, the last 10% is for server processing
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
    } else if (uploadProgress > 0) {
      // Set to 100% when done
      setUploadProgress(100);
      
      // Reset after showing complete
      const timeout = setTimeout(() => {
        setUploadProgress(0);
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
    
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isUploading, uploadProgress]);

  // Listen for console logs to update the status
  useEffect(() => {
    if (isUploading) {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        setUploadStatus(prev => prev + message + "\n");
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        const message = args.map(arg => 
          typeof arg === 'object' && arg instanceof Error
            ? `${arg.name}: ${arg.message}`
            : typeof arg === 'object' 
              ? JSON.stringify(arg, null, 2) 
              : String(arg)
        ).join(' ');
        
        setUploadStatus(prev => prev + "ERROR: " + message + "\n");
        
        // Extract error for UI display
        if (args[0] === "Upload process error:" && args[1]) {
          setErrorDetails(typeof args[1] === 'object' 
            ? (args[1].message || JSON.stringify(args[1])) 
            : String(args[1]));
        }
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [isUploading]);

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
    setUploadStatus("");
    setErrorDetails(null);
    
    const success = await uploadResume(file);
    if (success) {
      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
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
      {isUploading && (
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
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
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
          uploadStatus={uploadStatus}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

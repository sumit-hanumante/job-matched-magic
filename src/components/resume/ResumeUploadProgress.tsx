
import { Progress } from "@/components/ui/progress";
import { AlertCircle } from "lucide-react";

interface ResumeUploadProgressProps {
  isUploading: boolean;
  progress: number;
  errorDetails: string | null;
}

const ResumeUploadProgress = ({ 
  isUploading, 
  progress, 
  errorDetails 
}: ResumeUploadProgressProps) => {
  if (!isUploading && !errorDetails) return null;
  
  return (
    <div className="space-y-2 animate-fade-in">
      {isUploading && (
        <div className="mb-4 space-y-2">
          <div className="flex justify-between items-center text-sm text-slate-600 mb-1">
            <span>Uploading resume...</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
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
    </div>
  );
};

export default ResumeUploadProgress;

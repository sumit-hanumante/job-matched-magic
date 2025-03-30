
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadFormProps {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
  isAuthenticated: boolean;
}

const ResumeUploadForm = ({ file, isUploading, onUpload, isAuthenticated }: ResumeUploadFormProps) => {
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const { toast } = useToast();
  
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
        
        setUploadStatus(prev => prev + "LOG: " + message + "\n");
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        const message = args.map(arg => 
          typeof arg === 'object' && arg instanceof Error
            ? `${arg.name}: ${arg.message}\nStack: ${arg.stack}`
            : typeof arg === 'object' 
              ? JSON.stringify(arg, null, 2) 
              : String(arg)
        ).join(' ');
        
        setUploadStatus(prev => prev + "ERROR: " + message + "\n");
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [isUploading]);
  
  if (!file) return null;

  // Reset the status when upload starts
  const handleUpload = () => {
    setUploadStatus("");
    onUpload();
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
        <FileText className="w-4 h-4" />
        {file.name} ({Math.round(file.size / 1024)} KB)
      </div>
      
      {!isAuthenticated && (
        <p className="text-sm text-primary bg-primary/5 p-3 rounded-lg text-center">
          Click upload to continue. You'll be asked to create an account to save your resume and get personalized job matches.
        </p>
      )}
      
      <Button 
        onClick={handleUpload} 
        disabled={isUploading}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isUploading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Processing Resume...
          </span>
        ) : (
          "Upload Resume"
        )}
      </Button>

      {isUploading && (
        <div className="mt-4 p-4 bg-secondary/10 rounded-lg animate-fade-in">
          <h3 className="text-sm font-medium mb-2">Upload Progress:</h3>
          <div className="max-h-60 overflow-auto rounded border border-border p-2 bg-black/5">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {uploadStatus || "Starting upload process..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadForm;

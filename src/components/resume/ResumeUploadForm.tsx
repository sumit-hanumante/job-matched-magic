
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadFormProps {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
  isAuthenticated: boolean;
}

const ResumeUploadForm = ({ file, isUploading, onUpload, isAuthenticated }: ResumeUploadFormProps) => {
  const [uploadInfo, setUploadInfo] = useState<string>("");
  const { toast } = useToast();
  
  if (!file) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
        <FileText className="w-4 h-4" />
        {file.name}
      </div>
      {!isAuthenticated && (
        <p className="text-sm text-primary bg-primary/5 p-3 rounded-lg text-center">
          Click upload to continue. You'll be asked to create an account to save your resume and get personalized job matches.
        </p>
      )}
      <Button 
        onClick={onUpload} 
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

      {isUploading && uploadInfo && (
        <div className="mt-4 p-4 bg-secondary/10 rounded-lg animate-fade-in">
          <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
            {uploadInfo}
          </pre>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadForm;

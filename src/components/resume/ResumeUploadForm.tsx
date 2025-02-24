
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeUploadFormProps {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
}

const ResumeUploadForm = ({ file, isUploading, onUpload }: ResumeUploadFormProps) => {
  if (!file) return null;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
        <FileText className="w-4 h-4" />
        {file.name}
      </div>
      <Button 
        onClick={onUpload} 
        disabled={isUploading}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isUploading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Uploading...
          </span>
        ) : (
          "Upload Resume"
        )}
      </Button>
    </div>
  );
};

export default ResumeUploadForm;

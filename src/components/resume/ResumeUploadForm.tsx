
import { FileText, RefreshCw, Upload, X, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ResumeUploadFormProps {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
  onCancel: () => void;
  isAuthenticated: boolean;
  uploadStatus?: string;
}

const ResumeUploadForm = ({ 
  file, 
  isUploading, 
  onUpload, 
  onCancel,
  isAuthenticated,
  uploadStatus = "" 
}: ResumeUploadFormProps) => {
  const [showLogs, setShowLogs] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  if (!file) return null;

  const fileSize = file.size < 1024 * 1024 
    ? `${Math.round(file.size / 1024)} KB` 
    : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

  const fileIcon = file.name.endsWith('.pdf') ? 'PDF' : 'DOC';

  return (
    <div className="space-y-5 animate-slide-up bg-white rounded-xl border border-slate-200 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center text-white font-medium text-sm",
          fileIcon === 'PDF' ? "bg-red-500" : "bg-blue-500"
        )}>
          {fileIcon}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-slate-800 truncate" title={file.name}>
            {file.name}
          </h3>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>{fileSize}</span>
            <span className="inline-block w-1 h-1 rounded-full bg-slate-300"></span>
            <span>{file.type.split('/')[1].toUpperCase()}</span>
          </div>
        </div>
        
        {!isUploading && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {!isAuthenticated && (
        <div className="p-3 bg-primary-50 border border-primary-100 rounded-lg text-primary-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-primary-500 shrink-0" />
          <span>
            You'll need to create an account after uploading to get personalized job matches
          </span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button 
          onClick={onUpload} 
          disabled={isUploading}
          className="flex-1 bg-primary hover:bg-primary-600 text-white gap-2"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Resume
            </>
          )}
        </Button>

        {!isUploading && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Button>
        )}
      </div>

      {isUploading && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowLogs(!showLogs)}
          className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800 mt-2"
        >
          {showLogs ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Hide processing logs</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>View processing logs</span>
            </>
          )}
        </Button>
      )}

      {showLogs && uploadStatus && (
        <div className="mt-4 p-3 animate-fade-in">
          <h3 className="text-xs font-medium mb-2 text-slate-600">Processing logs:</h3>
          <div className="max-h-40 overflow-auto rounded border border-slate-200 p-2 bg-slate-50">
            <pre className="text-xs whitespace-pre-wrap font-mono text-slate-700">
              {uploadStatus || "Starting upload process..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeUploadForm;

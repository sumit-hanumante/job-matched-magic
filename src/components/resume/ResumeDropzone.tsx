
import { Upload, FileText, Lock, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResumeDropzoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  hasExistingResume: boolean;
  isAuthenticated: boolean;
}

const ResumeDropzone = ({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
  hasExistingResume,
  isAuthenticated,
}: ResumeDropzoneProps) => {
  const isMobile = useIsMobile();

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "p-6 sm:p-8 rounded-xl text-center transition-all duration-300 bg-white animate-fade-in",
        isDragging 
          ? "border-2 border-primary border-dashed bg-primary-50/50 ring-2 ring-primary/20" 
          : "border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-slate-50/50"
      )}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary-100 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto opacity-50" />
        <div className="absolute inset-0 bg-primary-100/50 rounded-full w-24 h-24 sm:w-28 sm:h-28 mx-auto animate-pulse" style={{ animationDuration: "3s" }} />
        <Upload 
          className="w-10 h-10 sm:w-12 sm:h-12 mx-auto relative z-10 text-primary-500" 
          strokeWidth={1.5} 
        />
      </div>
      
      <h3 className="text-lg sm:text-xl font-semibold text-slate-800 mb-2">
        {hasExistingResume ? "Update Your Resume" : "Upload Your Resume"}
      </h3>
      
      <p className="text-sm sm:text-base text-slate-600 mb-6 max-w-sm mx-auto">
        {isDragging 
          ? "Drop your file here to upload" 
          : "Drop your PDF or DOCX file here, or click to browse"
        }
      </p>
      
      {!isAuthenticated && (
        <div className="mb-6 py-3 px-4 bg-primary-50/80 rounded-lg border border-primary-100 flex items-center gap-2 max-w-sm mx-auto">
          <Lock className="h-4 w-4 text-primary-600 shrink-0" />
          <p className="text-sm text-primary-700 text-left">
            Sign in after uploading to save your resume and get personalized job matches
          </p>
        </div>
      )}
      
      <div className="flex justify-center items-center gap-3">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx"
          onChange={onFileSelect}
        />
        
        <label
          htmlFor="file-upload"
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-lg transition-colors cursor-pointer font-medium",
            isMobile ? "text-sm" : "text-base"
          )}
        >
          <FileText className="w-4 h-4" />
          Choose File
        </label>
        
        {!isMobile && (
          <div className="text-sm text-slate-500">
            or drag file here
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-slate-500 flex flex-col items-center gap-2">
        <div className="text-xs uppercase tracking-wider">Supported formats</div>
        <div className="flex gap-3">
          <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">PDF</span>
          <span className="px-2 py-1 bg-slate-100 rounded text-slate-600">DOCX</span>
        </div>
      </div>
    </div>
  );
};

export default ResumeDropzone;

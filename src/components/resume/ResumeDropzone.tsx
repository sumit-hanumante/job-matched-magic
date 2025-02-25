
import { Upload, FileText, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  if (!isAuthenticated) {
    return (
      <div className="p-8 rounded-xl text-center border-2 border-dashed border-gray-200 bg-secondary/50">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-primary/5 rounded-full w-20 h-20 mx-auto" />
          <Lock className="w-12 h-12 mx-auto text-muted-foreground relative" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sign In Required</h3>
        <p className="text-sm text-muted-foreground">
          Please sign in to upload your resume and get personalized job matches
        </p>
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        p-8
        rounded-xl
        text-center
        transition-all
        duration-300
        border-2
        shadow-sm
        bg-white/50
        backdrop-blur-sm
        ${isDragging 
          ? "border-primary border-dashed bg-primary/5 ring-2 ring-primary/20" 
          : "border-dashed border-gray-300 hover:border-primary/50 hover:bg-gray-50/50"
        }
      `}
    >
      <div className="relative">
        <div className="absolute inset-0 bg-primary/5 rounded-full w-20 h-20 mx-auto" />
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary relative" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">
        {hasExistingResume ? "Update Your Resume" : "Upload Your Resume"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Drop your PDF or DOCX file here, or click to browse
      </p>
      
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept=".pdf,.docx"
        onChange={onFileSelect}
      />
      
      <label
        htmlFor="file-upload"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors cursor-pointer font-medium"
      >
        <FileText className="w-4 h-4" />
        Choose File
      </label>
    </div>
  );
};

export default ResumeDropzone;

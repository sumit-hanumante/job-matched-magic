
import { useState } from "react";
import { Upload, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

const ResumeUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

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
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file",
      });
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === "application/pdf" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setFile(selectedFile);
      } else {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload a PDF or DOCX file",
        });
      }
    }
  };

  const uploadResume = async () => {
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Create the user-specific folder path
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      // Create resume record in database
      const { error: dbError, data: resumeData } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Call the parse-resume function
      const { error: parseError } = await supabase.functions
        .invoke('parse-resume', {
          body: {
            resumeUrl: publicUrl,
            userId: user.id,
            resumeId: resumeData.id
          }
        });

      if (parseError) throw parseError;

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being analyzed. We'll notify you when it's complete.",
      });

      setFile(null);
      
      // Reset the file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading your resume",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
        
        <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drop your PDF or DOCX file here, or click to browse
        </p>
        
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx"
          onChange={handleFileInput}
        />
        
        <div className="space-y-4">
          <label
            htmlFor="file-upload"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors cursor-pointer font-medium"
          >
            <FileText className="w-4 h-4" />
            Choose File
          </label>

          {file && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                <FileText className="w-4 h-4" />
                {file.name}
              </div>
              <Button 
                onClick={uploadResume} 
                disabled={isUploading}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isUploading ? "Uploading..." : "Upload Resume"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;

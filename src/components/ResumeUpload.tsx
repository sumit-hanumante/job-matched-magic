
import { useState } from "react";
import { Upload } from "lucide-react";
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
      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Resume uploaded successfully",
        description: "We'll process your resume and match you with relevant jobs.",
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
          ${isDragging ? "border-primary border-dashed bg-primary/5" : "border-dashed border-gray-300"}
        `}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
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
            className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Choose File
          </label>

          {file && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Selected file: {file.name}
              </div>
              <Button 
                onClick={uploadResume} 
                disabled={isUploading}
                className="w-full"
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

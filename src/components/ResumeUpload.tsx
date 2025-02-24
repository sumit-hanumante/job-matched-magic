
import { useState, useEffect } from "react";
import { Upload, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";

const ResumeUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [currentResume, setCurrentResume] = useState<{
    filename?: string;
    status?: string;
    uploaded_at?: string;
    id?: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCurrentResume();
    }
  }, [user]);

  const fetchCurrentResume = async () => {
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, file_name, status, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentResume({
          id: data.id,
          filename: data.file_name,
          status: data.status,
          uploaded_at: new Date(data.created_at).toLocaleDateString()
        });
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
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
      // First, delete the old resume file if it exists
      if (currentResume?.id) {
        const { data: existingResumes } = await supabase
          .from('resumes')
          .select('file_path')
          .eq('id', currentResume.id)
          .single();

        if (existingResumes?.file_path) {
          await supabase.storage
            .from('resumes')
            .remove([existingResumes.file_path]);
        }

        // Delete the old resume record
        await supabase
          .from('resumes')
          .delete()
          .eq('id', currentResume.id);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (dbError) throw dbError;

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being analyzed. We'll notify you when it's complete.",
      });

      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchCurrentResume();
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

  if (!user) return null;

  return (
    <div className="w-full max-w-xl mx-auto">
      {currentResume && (
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Current Resume</h4>
          <p className="text-sm text-muted-foreground">
            {currentResume.filename}
          </p>
          <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
            <span>Uploaded: {currentResume.uploaded_at}</span>
            <span className="Capitalize">Status: {currentResume.status}</span>
          </div>
        </div>
      )}

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
        
        <h3 className="text-lg font-semibold mb-2">
          {currentResume ? "Update Your Resume" : "Upload Your Resume"}
        </h3>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;


import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";

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
        <ResumeDisplay
          filename={currentResume.filename || ''}
          uploadedAt={currentResume.uploaded_at || ''}
          status={currentResume.status || ''}
        />
      )}

      <ResumeDropzone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileInput}
        hasExistingResume={!!currentResume}
      />

      {file && (
        <ResumeUploadForm
          file={file}
          isUploading={isUploading}
          onUpload={uploadResume}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

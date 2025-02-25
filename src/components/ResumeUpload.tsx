
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/AuthProvider";
import ResumeDisplay from "./resume/ResumeDisplay";
import ResumeDropzone from "./resume/ResumeDropzone";
import ResumeUploadForm from "./resume/ResumeUploadForm";

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [currentResume, setCurrentResume] = useState<{
    filename?: string;
    status?: string;
    uploaded_at?: string;
    id?: string;
    file_path?: string;
  } | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchCurrentResume();
    }
  }, [user]);

  const fetchCurrentResume = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('resumes')
        .select('id, file_name, status, created_at, file_path')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching resume:', error);
        return;
      }

      if (data) {
        setCurrentResume({
          id: data.id,
          filename: data.file_name,
          status: data.status,
          uploaded_at: new Date(data.created_at).toLocaleDateString(),
          file_path: data.file_path
        });
      } else {
        setCurrentResume(null);
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
    if (selectedFile && (selectedFile.type === "application/pdf" || selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(selectedFile);
    }
  };

  const shiftResumes = async (userId: string) => {
    try {
      // Get current resumes ordered by order_index
      const { data: resumes, error: fetchError } = await supabase
        .from('resumes')
        .select('id, order_index')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      if (resumes) {
        // Shift existing resumes
        for (const resume of resumes) {
          const newIndex = resume.order_index + 1;
          if (newIndex <= 3) {
            await supabase
              .from('resumes')
              .update({ order_index: newIndex })
              .eq('id', resume.id);
          } else {
            // Delete resumes beyond the 3rd position
            await supabase
              .from('resumes')
              .delete()
              .eq('id', resume.id);
          }
        }
      }
    } catch (error) {
      console.error('Error shifting resumes:', error);
      throw error;
    }
  };

  const uploadResume = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      console.log('Starting resume upload...');

      if (!user) {
        // For non-authenticated users, upload to temp storage
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from('temp-resumes')
          .upload(tempFileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('temp-resumes')
          .getPublicUrl(data.path);

        // Trigger login flow with success message
        if (onLoginRequired) {
          onLoginRequired();
        }

        toast({
          title: "File uploaded successfully",
          description: "Please create an account to analyze your resume and get job matches.",
        });

        setFile(null);
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        return;
      }

      // For authenticated users
      console.log('Authenticated user, proceeding with upload...');

      // Step 1: Shift existing resumes
      await shiftResumes(user.id);

      // Step 2: Upload new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Step 3: Create resume record
      const { error: insertError, data: resumeData } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: 'uploaded',
          order_index: 1
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup uploaded file if insert fails
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      // Step 4: Trigger resume parsing in background
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      await supabase.functions.invoke('parse-resume', {
        body: { 
          resumeUrl: publicUrl,
          userId: user.id,
          resumeId: resumeData.id
        }
      });

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being analyzed in the background. We'll notify you when it's complete.",
      });

      setFile(null);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await fetchCurrentResume();
      
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
      {currentResume && (
        <ResumeDisplay
          filename={currentResume.filename || ''}
          uploadedAt={currentResume.uploaded_at || ''}
          status={currentResume.status || ''}
          onUpdateClick={() => {
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.click();
          }}
        />
      )}

      <ResumeDropzone
        isDragging={isDragging}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFileSelect={handleFileInput}
        hasExistingResume={!!currentResume}
        isAuthenticated={!!user}
      />

      {file && (
        <ResumeUploadForm
          file={file}
          isUploading={isUploading}
          onUpload={uploadResume}
          isAuthenticated={!!user}
        />
      )}
    </div>
  );
};

export default ResumeUpload;

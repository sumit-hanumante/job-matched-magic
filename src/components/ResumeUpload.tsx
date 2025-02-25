
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

  const updateResumeOrders = async (userId: string) => {
    try {
      // Get current resumes ordered by order_index
      const { data: resumes, error: fetchError } = await supabase
        .from('resumes')
        .select('id')
        .eq('user_id', userId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;

      // If we have more than 3 resumes, delete the oldest ones
      if (resumes && resumes.length >= 3) {
        const resumesToDelete = resumes.slice(2); // Get all resumes after the first 2
        
        for (const resume of resumesToDelete) {
          const { error: deleteError } = await supabase
            .from('resumes')
            .delete()
            .eq('id', resume.id);
            
          if (deleteError) throw deleteError;
        }
      }

      // Update order_index for remaining resumes
      const { error: updateError } = await supabase
        .from('resumes')
        .update({ order_index: 2 })
        .eq('user_id', userId)
        .eq('order_index', 1);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating resume orders:', error);
      throw error;
    }
  };

  const uploadResume = async () => {
    if (!file) return;

    try {
      setIsUploading(true);
      console.log('Starting resume upload...');

      if (!user) {
        // For non-authenticated users, just parse the resume
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/parse-resume', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error(`Failed to parse resume: ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Resume parsed successfully:', data);

          if (onLoginRequired) {
            onLoginRequired(data.email, data.fullName);
          }

          setFile(null);
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';

          toast({
            title: "Resume parsed successfully",
            description: "Create an account to save your resume and get personalized job matches.",
          });
        } catch (error) {
          console.error('Error parsing resume:', error);
          throw error;
        }
        return;
      }

      // For authenticated users, handle the full upload process
      console.log('Authenticated user, proceeding with full upload...');

      // Update order of existing resumes first
      await updateResumeOrders(user.id);

      // Prepare file upload
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading file to storage:', filePath);

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw uploadError;
      }

      console.log('File uploaded successfully, creating database record...');

      // Create database record
      const { error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: 'pending',
          order_index: 1,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Database insert error:', insertError);
        // Cleanup uploaded file if insert fails
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      console.log('Resume upload completed successfully');

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume is being analyzed. We'll notify you when it's complete.",
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

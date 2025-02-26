
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";

export const useResumeUpload = (user: any, onLoginRequired?: (email?: string, fullName?: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const uploadResume = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);
      console.log('Starting resume upload...');

      if (!user) {
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError, data } = await supabase.storage
          .from('temp-resumes')
          .upload(tempFileName, file);

        if (uploadError) throw uploadError;

        if (onLoginRequired) {
          onLoginRequired();
        }

        toast({
          title: "File uploaded successfully",
          description: "Please create an account to analyze your resume and get job matches.",
        });

        return;
      }

      console.log('Authenticated user, proceeding with upload...');
      const fileText = await file.text();
      console.log('File content read, starting parsing...');

      const { data: parseResponse, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { 
          resumeText: fileText,
          debugMode: true
        }
      });

      if (parseError) throw parseError;

      console.log('Resume parsed successfully:', parseResponse);

      await shiftResumes(user.id);

      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: 'processed',
          order_index: 1,
          extracted_skills: parseResponse?.skills || [],
          experience: parseResponse?.experience || '',
          preferred_locations: parseResponse?.preferredLocations || [],
          preferred_companies: parseResponse?.preferredCompanies || []
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been processed and saved.",
      });

      return true;
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred while uploading your resume",
      });
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  return { isUploading, uploadResume };
};

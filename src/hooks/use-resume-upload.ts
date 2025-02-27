
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";

export const useResumeUpload = (user: any, onLoginRequired?: (email?: string, fullName?: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      // For PDF files, we'll get the text directly
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const text = new TextDecoder().decode(arrayBuffer);
        return text;
      }
      // For DOCX files, we'll get the raw text
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const text = await file.text();
        return text;
      }
      throw new Error('Unsupported file type');
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  };

  const uploadResume = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);
      console.log('Starting resume upload...');

      if (!user) {
        const tempFileName = `${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
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

      // First, try to upload the file
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      console.log('File uploaded successfully, extracting text...');

      // Extract text from file
      const resumeText = await extractTextFromFile(file);
      console.log('Text extracted, length:', resumeText.length);

      // Parse the resume using the edge function
      let parseResponse;
      try {
        const { data, error: parseError } = await supabase.functions.invoke('parse-resume', {
          body: { 
            resumeText,
            debugMode: true
          }
        });
        
        if (parseError) throw parseError;
        parseResponse = data;
        console.log('Resume parsed successfully:', parseResponse);
      } catch (parseError) {
        console.error('Parsing failed:', parseError);
        // Continue with upload but mark as pending parsing
        parseResponse = null;
      }

      await shiftResumes(user.id);

      const { error: insertError } = await supabase
        .from('resumes')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          content_type: file.type,
          status: parseResponse ? 'processed' : 'pending',
          order_index: 1,
          extracted_skills: parseResponse?.skills || [],
          experience: parseResponse?.experience || '',
          preferred_locations: parseResponse?.preferredLocations || [],
          preferred_companies: parseResponse?.preferredCompanies || []
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

      toast({
        title: "Resume uploaded successfully",
        description: parseResponse 
          ? "Your resume has been processed and saved."
          : "Your resume has been uploaded. We'll process it shortly.",
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

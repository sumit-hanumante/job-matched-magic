
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";

export const useResumeUpload = (user: any, onLoginRequired?: (email?: string, fullName?: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      console.log('Starting text extraction from file:', file.name);
      console.log('File type:', file.type);
      
      let text = '';
      
      // For PDF files
      if (file.type === 'application/pdf') {
        console.log('Processing PDF file...');
        const arrayBuffer = await file.arrayBuffer();
        text = new TextDecoder().decode(arrayBuffer);
        console.log('PDF text extracted, length:', text.length);
        console.log('First 200 characters:', text.substring(0, 200));
      }
      // For DOCX files
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        console.log('Processing DOCX file...');
        text = await file.text();
        console.log('DOCX text extracted, length:', text.length);
        console.log('First 200 characters:', text.substring(0, 200));
      }
      else {
        throw new Error('Unsupported file type: ' + file.type);
      }

      if (!text || text.length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      return text;
    } catch (error) {
      console.error('Error in extractTextFromFile:', error);
      throw error;
    }
  };

  const uploadResume = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);
      console.log('Starting resume upload process...');
      console.log('File details:', {
        name: file.name,
        type: file.type,
        size: file.size + ' bytes'
      });

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

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('Uploading file to storage:', filePath);
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log('File uploaded successfully to storage');

      // Extract text from file
      console.log('Starting text extraction...');
      const resumeText = await extractTextFromFile(file);
      console.log('Text extraction completed:', {
        textLength: resumeText.length,
        sample: resumeText.substring(0, 100) + '...'
      });

      // Parse the resume using the edge function
      let parseResponse;
      try {
        console.log('Sending text to parse-resume function...');
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
        parseResponse = null;
      }

      await shiftResumes(user.id);

      console.log('Inserting resume record into database...');
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
        console.error('Database insert failed:', insertError);
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      console.log('Resume upload process completed successfully');
      toast({
        title: "Resume uploaded successfully",
        description: parseResponse 
          ? "Your resume has been processed and saved."
          : "Your resume has been uploaded. We'll process it shortly.",
      });

      return true;
    } catch (error) {
      console.error('Upload process error:', error);
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

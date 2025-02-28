
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { shiftResumes } from "@/lib/resume-utils";

export const useResumeUpload = (user: any, onLoginRequired?: (email?: string, fullName?: string) => void) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const extractTextFromPDF = async (file: File): Promise<string> => {
    console.log('Starting PDF text extraction');
    
    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Convert ArrayBuffer to base64
    const base64String = btoa(
      new Uint8Array(arrayBuffer)
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    
    console.log('PDF converted to base64, length:', base64String.length);
    
    // Call edge function to extract text from PDF
    try {
      const { data, error } = await supabase.functions.invoke('extract-pdf-text', {
        body: { pdfBase64: base64String }
      });
      
      if (error) throw error;
      
      console.log('PDF text extracted successfully:', {
        textLength: data.text.length,
        sample: data.text.substring(0, 200)
      });
      
      return data.text;
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    try {
      console.log('Starting text extraction from file:', file.name);
      console.log('File type:', file.type);
      
      let text = '';
      
      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // For DOCX, try direct text extraction first
        text = await file.text();
        console.log('DOCX raw text extracted, length:', text.length);
      } else {
        throw new Error('Unsupported file type: ' + file.type);
      }

      if (!text || text.length === 0) {
        throw new Error('No text could be extracted from the file');
      }

      // Clean up the extracted text
      text = text
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      console.log('Extracted and cleaned text:', {
        length: text.length,
        sample: text.substring(0, 500)
      });

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

      // Extract text from file
      console.log('Starting text extraction...');
      const resumeText = await extractTextFromFile(file);
      console.log('Text extracted successfully:', {
        length: resumeText.length,
        sample: resumeText.substring(0, 300)
      });

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

      // Parse the resume using the edge function
      console.log('Sending text to parse-resume function...');
      console.log('Resume text being sent (first 1000 chars):', resumeText.substring(0, 1000));
      
      const { data: parseResponse, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { resumeText }
      });

      if (parseError) {
        console.error('Parse resume error:', parseError);
        throw parseError;
      }

      // Log detailed Gemini response
      console.log('=============== GEMINI RESPONSE START ===============');
      console.log('Full Gemini response:', JSON.stringify(parseResponse, null, 2));
      console.log('Skills:', parseResponse?.data?.skills);
      console.log('Experience:', parseResponse?.data?.experience);
      console.log('Education:', parseResponse?.data?.education);
      console.log('Preferred Locations:', parseResponse?.data?.preferredLocations);
      console.log('Preferred Companies:', parseResponse?.data?.preferredCompanies);
      console.log('=============== GEMINI RESPONSE END ===============');

      await shiftResumes(user.id);

      console.log('Inserting resume record into database...');
      const resumeData = {
        user_id: user.id,
        file_name: file.name,
        file_path: filePath,
        content_type: file.type,
        status: 'processed',
        order_index: 1,
        extracted_skills: parseResponse?.data?.skills || [],
        experience: parseResponse?.data?.experience || '',
        preferred_locations: parseResponse?.data?.preferredLocations || [],
        preferred_companies: parseResponse?.data?.preferredCompanies || []
      };
      
      console.log('Resume data to be inserted:', JSON.stringify(resumeData, null, 2));
      
      const { data: insertedResume, error: insertError } = await supabase
        .from('resumes')
        .insert(resumeData)
        .select()
        .single();

      if (insertError) {
        console.error('Database insert failed:', insertError);
        await supabase.storage
          .from('resumes')
          .remove([filePath]);
        throw insertError;
      }

      console.log('Resume inserted successfully:', JSON.stringify(insertedResume, null, 2));
      
      // Verify data was saved correctly by fetching it again
      const { data: verifyData, error: verifyError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', insertedResume.id)
        .single();
        
      if (verifyError) {
        console.error('Verification query failed:', verifyError);
      } else {
        console.log('Verification of saved data:', JSON.stringify(verifyData, null, 2));
        console.log('Saved skills:', verifyData.extracted_skills);
        console.log('Saved experience:', verifyData.experience);
        console.log('Saved locations:', verifyData.preferred_locations);
        console.log('Saved companies:', verifyData.preferred_companies);
      }

      console.log('Resume upload process completed successfully');
      toast({
        title: "Resume uploaded successfully",
        description: "Your resume has been processed and saved.",
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

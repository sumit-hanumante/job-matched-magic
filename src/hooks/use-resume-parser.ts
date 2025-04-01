
import { supabase } from "@/lib/supabase";

// Service focused on resume parsing using the edge function
export const useResumeParser = () => {
  // Test if the resume parsing function is working
  const testParserFunction = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { test: true }
      });
      
      if (error) {
        console.error("[ResumeParser] Parser function test error:", error);
        return false;
      }
      
      return data?.success === true;
    } catch (error) {
      console.error("[ResumeParser] Failed to test parser function:", error);
      return false;
    }
  };

  // Parse the resume text using the edge function
  const parseResumeText = async (resumeText: string) => {
    if (!resumeText || resumeText.length < 10) {
      throw new Error("Resume text is too short to be parsed");
    }

    try {
      // Create payload with the resume text
      const payload = { resumeText };
      
      // Invoke the edge function
      const { data: responseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
      });
      
      if (parseError) {
        throw parseError;
      }
      
      if (!responseData?.success) {
        const errorMsg = responseData?.error || "Failed to parse resume";
        throw new Error(errorMsg);
      }
      
      if (responseData.data) {
        return responseData.data;
      } else {
        return {
          summary: "Resume parsing completed but no detailed information was extracted.",
          extracted_skills: [],
          personal_information: {}
        };
      }
    } catch (error) {
      console.error("[ResumeParser] Error parsing resume:", error);
      
      // Return minimal valid structure
      return {
        summary: "Resume parsing failed. Please try again later.",
        extracted_skills: [],
        personal_information: {}
      };
    }
  };

  return {
    testParserFunction,
    parseResumeText
  };
};

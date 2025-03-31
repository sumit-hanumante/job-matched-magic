
import { supabase } from "@/lib/supabase";

// Service focused on resume parsing using the edge function
export const useResumeParser = () => {
  // Test if the resume parsing function is working
  const testParserFunction = async (): Promise<boolean> => {
    try {
      console.log("Testing resume parser function");
      
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        body: { test: true }
      });
      
      if (error) {
        console.error("Parser function test error:", error);
        return false;
      }
      
      console.log("Parser function test response:", data);
      return data?.success === true;
    } catch (error) {
      console.error("Failed to test parser function:", error);
      return false;
    }
  };

  // Parse the resume text using the edge function
  const parseResumeText = async (resumeText: string) => {
    if (!resumeText || resumeText.length < 10) {
      throw new Error("Resume text is too short to be parsed");
    }

    console.log(`Sending ${resumeText.length} characters of text to parse function`);
    
    const { data: responseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
      method: "POST",
      body: { resumeText }
    });
    
    if (parseError) {
      console.error("Edge function error details:", {
        name: parseError.name,
        message: parseError.message,
        code: parseError.code,
        stack: parseError.stack,
      });
      throw parseError;
    }
    
    console.log("Edge function response received:", 
      responseData ? Object.keys(responseData) : "No data");
    
    if (!responseData?.success) {
      const errorMsg = responseData?.error || "Failed to parse resume";
      console.error("Edge function execution failed:", errorMsg);
      throw new Error(errorMsg);
    }
    
    console.log("Resume parsed successfully");
    if (responseData.data) {
      console.log("Parsed data keys:", Object.keys(responseData.data));
      return responseData.data;
    } else {
      console.warn("No data returned from parse function");
      return null;
    }
  };

  return {
    testParserFunction,
    parseResumeText
  };
};

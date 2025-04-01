
import { supabase } from "@/lib/supabase";

// Service focused on resume parsing using the edge function
export const useResumeParser = () => {
  // Test if the resume parsing function is working
  const testParserFunction = async (): Promise<boolean> => {
    try {
      console.log("Testing resume parser function");
      
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      console.error("Resume text is too short:", resumeText);
      throw new Error("Resume text is too short to be parsed");
    }

    console.log(`Sending ${resumeText.length} characters of text to parse function`);
    console.log("First 50 chars of text:", resumeText.substring(0, 50));
    
    try {
      // Make sure we're sending a properly formatted JSON object
      const requestPayload = { resumeText };
      
      console.log("Request payload:", JSON.stringify(requestPayload).substring(0, 100) + "...");
      
      const { data: responseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestPayload
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
        return {
          summary: "",
          extracted_skills: [],
          personal_information: {}
        };
      }
    } catch (error) {
      console.error("Error parsing resume:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack available");
      
      // Return minimal valid structure instead of throwing
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

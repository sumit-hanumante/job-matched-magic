
import { supabase } from "@/lib/supabase";

// Service focused on resume parsing using the edge function
export const useResumeParser = () => {
  // Test if the resume parsing function is working
  const testParserFunction = async (): Promise<boolean> => {
    try {
      console.log("[ResumeParser] Testing resume parser function");
      
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { test: true }
      });
      
      if (error) {
        console.error("[ResumeParser] Parser function test error:", error);
        console.error("[ResumeParser] Error details:", JSON.stringify(error));
        return false;
      }
      
      console.log("[ResumeParser] Parser function test response:", data);
      return data?.success === true;
    } catch (error) {
      console.error("[ResumeParser] Failed to test parser function:", error);
      console.error("[ResumeParser] Error stack:", error instanceof Error ? error.stack : "No stack available");
      return false;
    }
  };

  // Parse the resume text using the edge function
  const parseResumeText = async (resumeText: string) => {
    if (!resumeText || resumeText.length < 10) {
      console.error("[ResumeParser] Resume text is too short:", resumeText);
      throw new Error("Resume text is too short to be parsed");
    }

    console.log(`[ResumeParser] Sending ${resumeText.length} characters of text to parse function`);
    console.log("[ResumeParser] First 50 chars of text:", resumeText.substring(0, 50));
    
    try {
      // Create payload - IMPORTANT: supabase.functions.invoke() handles JSON stringification
      // BUT we should still ensure our payload is structured correctly
      const payload = {
        resumeText: resumeText
      };
      
      console.log("[ResumeParser] Request payload structure:", Object.keys(payload));
      console.log("[ResumeParser] Request payload resumeText length:", payload.resumeText.length);
      console.log("[ResumeParser] Payload sample:", payload.resumeText.substring(0, 100) + '...');

      // Invoke the edge function
      console.log("[ResumeParser] Invoking edge function with properly formatted payload");
      
      const { data: responseData, error: parseError } = await supabase.functions.invoke("parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload // supabase client automatically handles JSON stringification
      });
      
      console.log("[ResumeParser] Edge function call completed");
      
      if (parseError) {
        console.error("[ResumeParser] Edge function error:", parseError);
        throw parseError;
      }
      
      console.log("[ResumeParser] Edge function response received:", 
        responseData ? Object.keys(responseData) : "No data");
      
      if (!responseData?.success) {
        const errorMsg = responseData?.error || "Failed to parse resume";
        console.error("[ResumeParser] Edge function execution failed:", errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log("[ResumeParser] Resume parsed successfully");
      if (responseData.data) {
        console.log("[ResumeParser] Parsed data keys:", Object.keys(responseData.data));
        
        if (responseData.data.extracted_skills?.length > 0) {
          console.log("[ResumeParser] Skills extracted:", responseData.data.extracted_skills.length);
          console.log("[ResumeParser] Sample skills:", responseData.data.extracted_skills.slice(0, 5));
        } else {
          console.warn("[ResumeParser] No skills were extracted from the resume");
        }
        
        return responseData.data;
      } else {
        console.warn("[ResumeParser] No data returned from parse function");
        return {
          summary: "Resume parsing completed but no detailed information was extracted.",
          extracted_skills: [],
          personal_information: {}
        };
      }
    } catch (error) {
      console.error("[ResumeParser] Error parsing resume:", error);
      console.error("[ResumeParser] Error stack:", error instanceof Error ? error.stack : "No stack available");
      
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

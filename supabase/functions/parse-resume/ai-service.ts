
import { ParsedResumeData } from "./types.ts";

// Service to handle AI API interactions
export async function processWithAI(prompt: string, apiKey: string): Promise<ParsedResumeData> {
  // Debug: Check if API key exists and log a portion of it
  console.log("-------------------------");
  console.log("GEMINI_API_KEY check:");
  if (!apiKey) {
    console.error("CRITICAL ERROR: GEMINI_API_KEY is undefined or empty");
  } else {
    console.log(`GEMINI_API_KEY exists with length: ${apiKey.length}`);
    console.log(`GEMINI_API_KEY first 4 chars: ${apiKey.substring(0, 4)}...`);
    console.log(`GEMINI_API_KEY last 4 chars: ...${apiKey.substring(apiKey.length - 4)}`);
  }
  console.log("-------------------------");

  console.log("Using Gemini API with key starting with:", `${apiKey.substring(0, 4)}...`);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  // Create the request payload
  const requestPayload = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      topK: 40
    }
  };
  
  // Log the request details
  console.log("Making API request to:", apiUrl);
  console.log("Request payload size:", JSON.stringify(requestPayload).length);
  console.log("Request headers: Content-Type=application/json");
  console.log("Request prompt first 100 chars:", prompt.substring(0, 100) + "...");

  try {
    console.log("Starting fetch to Gemini API at:", new Date().toISOString());
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload)
    });
    
    console.log(`Gemini API response status: ${response.status} ${response.statusText}`);
    console.log("Gemini API response headers:", JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status} ${response.statusText}`);
      console.error(`Error details: ${errorText}`);
      throw new Error(`Gemini API returned error ${response.status}: ${errorText}`);
    }
    
    console.log("Gemini API response is OK, parsing JSON");
    const responseData = await response.json();
    console.log("Gemini API response JSON parsed successfully");
    
    // Print complete Gemini API response to console for debugging
    console.log("COMPLETE GEMINI API RESPONSE:", JSON.stringify(responseData, null, 2));
    
    if (!responseData.candidates || responseData.candidates.length === 0) {
      console.error("No candidates in Gemini response:", JSON.stringify(responseData));
      throw new Error("No content in Gemini API response");
    }
    
    // Extract the text from the response
    const candidateContent = responseData.candidates[0].content;
    if (!candidateContent || !candidateContent.parts || candidateContent.parts.length === 0) {
      console.error("Unexpected Gemini response format:", JSON.stringify(responseData));
      throw new Error("Unexpected Gemini response format");
    }
    
    const rawText = candidateContent.parts[0].text;
    console.log(`Raw text response length: ${rawText.length}`);
    console.log(`Response preview: ${rawText.substring(0, 150)}...`);
    
    // Print the complete raw text response from Gemini for debugging
    console.log("COMPLETE GEMINI RAW TEXT RESPONSE:", rawText);
    
    // Parse the JSON from the response
    try {
      // Find JSON in the text (in case the model wrapped it with markdown)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : rawText;
      
      console.log("Attempting to parse JSON from response...");
      console.log("JSON string preview:", jsonString.substring(0, 150) + "...");
      
      const parsedData = JSON.parse(jsonString);
      console.log("Successfully parsed JSON response");
      console.log("Parsed data keys:", Object.keys(parsedData));
      
      // Print the complete parsed JSON for debugging
      console.log("COMPLETE PARSED JSON DATA:", JSON.stringify(parsedData, null, 2));
      
      // Ensure extracted_skills is always a string array
      if (parsedData.extracted_skills) {
        console.log("Processing extracted_skills of type:", typeof parsedData.extracted_skills);
        
        if (Array.isArray(parsedData.extracted_skills)) {
          // Ensure all items are strings
          parsedData.extracted_skills = parsedData.extracted_skills.map(item => String(item));
          console.log("Converted extracted_skills array items to strings");
        } else if (typeof parsedData.extracted_skills === 'string') {
          // Convert string to array
          if (parsedData.extracted_skills.includes(',')) {
            parsedData.extracted_skills = parsedData.extracted_skills.split(',').map(s => s.trim());
            console.log("Split comma-separated skills into array");
          } else {
            parsedData.extracted_skills = [parsedData.extracted_skills];
            console.log("Wrapped single skill string in array");
          }
        } else if (typeof parsedData.extracted_skills === 'object') {
          parsedData.extracted_skills = Object.values(parsedData.extracted_skills).map(String);
          console.log("Converted object values to string array");
        } else {
          console.warn("Invalid extracted_skills format, defaulting to empty array");
          parsedData.extracted_skills = [];
        }
      } else {
        console.log("No extracted_skills found, initializing as empty array");
        parsedData.extracted_skills = [];
      }
      
      return parsedData;
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", parseErr);
      console.error("Raw text response:", rawText);
      throw new Error("Failed to parse AI response as valid JSON");
    }
  } catch (error) {
    console.error("Error in API request:", error);
    console.error("Error stack:", error.stack || "No stack trace available");
    // Return a minimal valid structure instead of throwing
    return {
      summary: "Failed to parse resume due to an API error.",
      extracted_skills: [],
      personal_information: {}
    };
  }
}


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResume {
  skills: string[];
  experience: string;
  education?: string;
  preferredLocations?: string[];
  preferredCompanies?: string[];
}

async function processWithGemini(content: string): Promise<ParsedResume> {
  console.log('=========== GEMINI PROCESSING START ===========');
  console.log('Input text length:', content.length);
  console.log('Sample of input text:', content.substring(0, 300) + '...');
  
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  console.log('Gemini API Key present:', !!geminiKey);
  
  if (!geminiKey) {
    throw new Error('GEMINI_API_KEY not found in environment');
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `
    You are a resume parser. Analyze this resume text and extract the following information:
    1. All technical and soft skills mentioned
    2. A brief summary of work experience
    3. Education details
    4. Any preferred work locations mentioned
    5. List of companies worked at

    Format your response as a JSON object with these exact keys:
    {
      "skills": ["Array of all skills found"],
      "experience": "Brief summary of work experience",
      "education": "Education summary",
      "preferredLocations": ["Array of locations found"],
      "preferredCompanies": ["Array of companies worked at"]
    }

    Resume text to analyze:
    ${content}
  `;

  try {
    console.log('Sending request to Gemini with prompt length:', prompt.length);
    const result = await model.generateContent(prompt);
    console.log('Received response from Gemini');
    
    const response = result.response;
    const text = response.text();
    console.log('Raw response from Gemini:', text);

    // Clean up the response
    const cleanedText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('Cleaned response:', cleanedText);
    
    // Parse the JSON response
    const parsed = JSON.parse(cleanedText);
    console.log('Parsed JSON:', JSON.stringify(parsed, null, 2));

    const formattedResponse = {
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: typeof parsed.experience === 'string' ? parsed.experience : '',
      education: typeof parsed.education === 'string' ? parsed.education : '',
      preferredLocations: Array.isArray(parsed.preferredLocations) ? parsed.preferredLocations : [],
      preferredCompanies: Array.isArray(parsed.preferredCompanies) ? parsed.preferredCompanies : []
    };

    console.log('Final formatted response:', JSON.stringify(formattedResponse, null, 2));
    console.log('=========== GEMINI PROCESSING END ===========');
    
    return formattedResponse;
  } catch (error) {
    console.error('Error in Gemini processing:', error);
    console.log('=========== GEMINI PROCESSING ERROR ===========');
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=========== PARSE RESUME FUNCTION START ===========');
    console.log('Request received:', req.method, req.url);
    
    const { resumeText } = await req.json();
    console.log('Received resume text:', {
      length: resumeText?.length || 0,
      sample: resumeText ? resumeText.substring(0, 200) + '...' : 'No text'
    });
    
    if (!resumeText) {
      throw new Error('No resume text provided');
    }

    // Clean up the input text
    const cleanedText = resumeText
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();

    console.log('Cleaned input text:', {
      length: cleanedText.length,
      sample: cleanedText.substring(0, 200) + '...'
    });

    const parsedResume = await processWithGemini(cleanedText);
    console.log('Parse resume function completed successfully');
    console.log('=========== PARSE RESUME FUNCTION END ===========');

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    console.log('=========== PARSE RESUME FUNCTION ERROR ===========');
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

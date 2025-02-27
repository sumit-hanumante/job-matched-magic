
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
    Analyze this resume text and extract key information. Format the response as JSON with the following structure:
    {
      "skills": ["skill1", "skill2"],
      "experience": "brief work history",
      "education": "education summary",
      "preferredLocations": ["location1", "location2"],
      "preferredCompanies": ["company1", "company2"]
    }

    Resume text:
    ${content}
  `;

  console.log('Prompt sent to Gemini:', prompt.substring(0, 500) + '...');

  try {
    console.log('Sending request to Gemini...');
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
      skills: parsed.skills || [],
      experience: parsed.experience || '',
      education: parsed.education || '',
      preferredLocations: parsed.preferredLocations || [],
      preferredCompanies: parsed.preferredCompanies || []
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

    const parsedResume = await processWithGemini(resumeText);
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

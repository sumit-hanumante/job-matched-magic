
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
  console.log('Starting Gemini processing...');
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

  try {
    console.log('Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('Raw Gemini response:', text);

    // Clean up the response in case it returns markdown
    const cleanedText = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    console.log('Cleaned response:', cleanedText);
    
    // Parse the JSON response
    const parsed = JSON.parse(cleanedText);
    return {
      skills: parsed.skills || [],
      experience: parsed.experience || '',
      education: parsed.education || '',
      preferredLocations: parsed.preferredLocations || [],
      preferredCompanies: parsed.preferredCompanies || []
    };
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parsing request body...');
    const { resumeText } = await req.json();
    
    if (!resumeText) {
      throw new Error('No resume text provided');
    }

    console.log('Resume text length:', resumeText.length);
    console.log('Sample of resume text:', resumeText.substring(0, 100) + '...');

    // Process the resume with Gemini
    const parsedResume = await processWithGemini(resumeText);
    console.log('Successfully parsed resume:', parsedResume);

    return new Response(
      JSON.stringify({ success: true, data: parsedResume }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-resume function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

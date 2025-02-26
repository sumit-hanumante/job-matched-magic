
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIProvider {
  name: 'gemini' | 'huggingface';
  apiKey: string;
  processResume: (content: string) => Promise<ParsedResume>;
}

interface ParsedResume {
  skills: string[];
  experience: string;
  education?: string;
  preferredLocations?: string[];
  preferredCompanies?: string[];
}

async function processWithGemini(content: string): Promise<ParsedResume> {
  const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze this resume content and extract the following information in JSON format:
    - A list of technical and soft skills
    - A summary of work experience
    - Education details
    - Preferred work locations if mentioned
    - Previous companies worked at
    
    Resume content:
    ${content}
    
    Return the response in this exact JSON format:
    {
      "skills": ["skill1", "skill2"],
      "experience": "experience summary",
      "education": "education summary",
      "preferredLocations": ["location1", "location2"],
      "preferredCompanies": ["company1", "company2"]
    }
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('Gemini response:', text);
    
    // Parse the JSON response
    const parsed = JSON.parse(text);
    return {
      skills: parsed.skills || [],
      experience: parsed.experience || '',
      education: parsed.education,
      preferredLocations: parsed.preferredLocations,
      preferredCompanies: parsed.preferredCompanies
    };
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    throw error;
  }
}

// Will be expanded when adding more AI providers
const getAvailableProvider = (): AIProvider => {
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiKey) {
    throw new Error('No AI provider available');
  }

  return {
    name: 'gemini',
    apiKey: geminiKey,
    processResume: processWithGemini
  };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText } = await req.json();
    console.log('Received resume text length:', resumeText.length);
    
    // Get available AI provider
    const provider = getAvailableProvider();
    console.log('Using AI provider:', provider.name);

    if (!resumeText) {
      throw new Error('No resume text provided');
    }

    // Process the resume
    const parsedResume = await provider.processResume(resumeText);
    console.log('Parsed resume:', parsedResume);

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

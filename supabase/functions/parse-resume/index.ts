
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedResume {
  skills: string[];
  experience: string;
  salary?: string;
  location?: string;
  education: string[];
  jobTitle: string;
  industries: string[];
  languages: string[];
  certifications: string[];
  preferredWorkType?: 'remote' | 'hybrid' | 'onsite';
  availability?: string;
  achievements: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeUrl, userId, resumeId } = await req.json();

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Download resume content
    const response = await fetch(resumeUrl);
    const text = await response.text();

    // Initialize AI providers
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    let parsedData: ParsedResume | null = null;

    // Try Google Gemini first
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `Analyze this resume text and extract the following information in JSON format:
        - Top 5-10 technical skills
        - Total years of experience
        - Expected/current salary range (if mentioned)
        - Preferred job location or willing to relocate information
        - Educational qualifications
        - Current/Last job title
        - Industry expertise
        - Languages known
        - Certifications
        - Preferred work type (remote/hybrid/onsite) if mentioned
        - Immediate availability or notice period if mentioned
        - Key achievements or notable projects

        Return as JSON with this structure:
        {
          "skills": [],
          "experience": "",
          "salary": "",
          "location": "",
          "education": [],
          "jobTitle": "",
          "industries": [],
          "languages": [],
          "certifications": [],
          "preferredWorkType": "",
          "availability": "",
          "achievements": []
        }`;

        const result = await model.generateContent([text, prompt]);
        const response = await result.response;
        parsedData = JSON.parse(response.text());
      } catch (error) {
        console.error('Gemini API error:', error);
      }
    }

    // If Gemini fails, try Anthropic (future implementation)
    if (!parsedData && anthropicKey) {
      // Anthropic implementation would go here
      // This is a placeholder for future implementation
    }

    if (!parsedData) {
      throw new Error('Failed to parse resume with available AI providers');
    }

    // Update resume record with parsed data
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        extracted_skills: parsedData.skills,
        status: 'processed',
        parsed_data: parsedData  // This will require a database schema update
      })
      .eq('id', resumeId);

    if (updateError) throw updateError;

    // Delete the resume file from storage
    const { error: deleteError } = await supabase.storage
      .from('resumes')
      .remove([resumeUrl.split('/').pop()]);

    if (deleteError) {
      console.error('Error deleting file:', deleteError);
      // Continue execution even if delete fails
    }

    return new Response(
      JSON.stringify({ success: true, data: parsedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

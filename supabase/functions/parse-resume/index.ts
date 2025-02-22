
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3"

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

    // Initialize Gemini AI
    const geminiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiKey) {
      throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    // Use gemini-pro model which is available in the free tier
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

    // Use the free tier with safety settings
    const result = await model.generateContent([text, prompt]);
    const response = await result.response;
    const parsedData = JSON.parse(response.text()) as ParsedResume;

    console.log('Resume parsed successfully:', parsedData);

    // Update resume record with parsed data
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        extracted_skills: parsedData.skills,
        status: 'processed',
        parsed_data: parsedData
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

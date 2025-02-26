
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface HuggingFaceResponse {
  success: boolean;
  error?: string;
  skills?: string[];
  experience?: string;
  education?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { resumeUrl, userId, resumeId } = await req.json()
    
    // Get the resume content
    const response = await fetch(resumeUrl)
    const resumeContent = await response.text()

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseKey!)

    // Get API keys from environment variables
    const huggingFaceKeys = [
      Deno.env.get('HUGGINGFACE_API_KEY_1'),
      Deno.env.get('HUGGINGFACE_API_KEY_2'),
      Deno.env.get('HUGGINGFACE_API_KEY_3'),
    ].filter(Boolean) as string[]

    if (huggingFaceKeys.length === 0) {
      throw new Error('No Hugging Face API keys available')
    }

    // Rotate through API keys
    const keyIndex = Math.floor(Math.random() * huggingFaceKeys.length)
    const apiKey = huggingFaceKeys[keyIndex]

    // Call Hugging Face API for skill extraction
    const skillsResponse = await fetch(
      "https://api-inference.huggingface.co/models/microsoft/resumerise",
      {
        headers: { 
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify({ inputs: resumeContent }),
      }
    )

    if (!skillsResponse.ok) {
      throw new Error(`Hugging Face API error: ${skillsResponse.statusText}`)
    }

    const result = await skillsResponse.json()
    
    // Update resume record with extracted information
    const { error: updateError } = await supabase
      .from('resumes')
      .update({
        status: 'processed',
        extracted_skills: result.skills || [],
        experience: result.experience || '',
      })
      .eq('id', resumeId)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in parse-resume function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize PDFjs with worker source
const PDFJS_WORKER_SRC = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_SRC;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting PDF text extraction...');
    
    const { pdfBase64 } = await req.json();
    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    // Convert base64 to Uint8Array
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    console.log('PDF decoded from base64, size:', bytes.length);
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    
    console.log('PDF loaded, number of pages:', pdf.numPages);

    // Extract text from all pages
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    console.log('Text extraction completed:', {
      textLength: fullText.length,
      sample: fullText.substring(0, 200)
    });

    return new Response(
      JSON.stringify({ success: true, text: fullText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in PDF extraction:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

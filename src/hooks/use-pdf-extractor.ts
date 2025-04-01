
import * as pdfjsLib from "pdfjs-dist";

// Dynamically determine the proper worker URL based on the PDF.js version
const pdfVersion = pdfjsLib.version || "2.16.105";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfVersion}/pdf.worker.min.js`;

// Service focused on PDF text extraction
export const usePdfExtractor = () => {
  // Function to extract clean text from a PDF using pdfjs-dist.
  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      console.log("Starting PDF text extraction");
      const arrayBuffer = await file.arrayBuffer();
      console.log(`PDF buffer created, size: ${arrayBuffer.byteLength} bytes`);
      
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      console.log("PDF loading task created");
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully, pages: ${pdf.numPages}`);
      
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        console.log(`Processing page ${pageNum}/${pdf.numPages}`);
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Join text items from the page.
        const pageText = textContent.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
        console.log(`Page ${pageNum} extracted, text length: ${pageText.length}`);
      }
      
      console.log(`PDF extraction complete, total text length: ${fullText.length}`);
      return fullText.trim();
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      console.error("Error name:", error instanceof Error ? error.name : "Unknown");
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return { extractTextFromPDF };
};

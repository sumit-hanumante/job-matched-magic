
import { usePdfExtractor } from "./use-pdf-extractor";

// Service to extract text from various document formats
export const useDocumentTextExtractor = () => {
  const { extractTextFromPDF } = usePdfExtractor();

  // Extract text from various file types
  const extractTextFromFile = async (file: File): Promise<string> => {
    console.log(`Extracting text from ${file.name} (${file.type})`);
    console.log(`File size: ${file.size} bytes`);
    
    try {
      if (file.type === "application/pdf") {
        console.log("Using PDF extraction method");
        const text = await extractTextFromPDF(file);
        console.log(`PDF extraction successful, text length: ${text.length}`);
        return text;
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        console.log("Using DOCX extraction method (file.text())");
        const text = await file.text();
        console.log(`DOCX text extracted, length: ${text.length}`);
        return text;
      } else {
        console.error("Unsupported file type:", file.type);
        throw new Error("Unsupported file type: " + file.type);
      }
    } catch (error) {
      console.error("Text extraction failed:", error);
      console.error("Falling back to simple file.text() method");
      
      // Last resort: try to get the raw text
      try {
        const rawText = await file.text();
        console.log(`Fallback text extraction method returned ${rawText.length} characters`);
        return rawText;
      } catch (fallbackError) {
        console.error("Even fallback extraction failed:", fallbackError);
        throw new Error("Could not extract text from file using any available method");
      }
    }
  };

  return { extractTextFromFile };
};

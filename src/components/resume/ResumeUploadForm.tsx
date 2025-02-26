
import { FileText, RefreshCw, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ResumeUploadFormProps {
  file: File;
  isUploading: boolean;
  onUpload: () => void;
  isAuthenticated: boolean;
}

const ResumeUploadForm = ({ file, isUploading, onUpload, isAuthenticated }: ResumeUploadFormProps) => {
  const [debugInfo, setDebugInfo] = useState<string>("");
  const { toast } = useToast();
  
  if (!file) return null;

  // Temporary debug function
  const testParseResume = async () => {
    try {
      setDebugInfo("Starting debug process...");
      
      // 1. Test direct text parsing
      const testText = "B1 wing FlatNo-b202 mahesh galaxy, near sinhgad college vadgaon budruk pune 411041";
      setDebugInfo(prev => prev + "\n\nTesting with text: " + testText);

      // 2. Call parse-resume function
      setDebugInfo(prev => prev + "\n\nCalling AI parse function...");
      const { data: parseResponse, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: { 
          resumeText: testText,
          debugMode: true
        }
      });

      if (parseError) {
        setDebugInfo(prev => prev + "\n\nParsing Error: " + JSON.stringify(parseError));
        throw parseError;
      }

      setDebugInfo(prev => prev + "\n\nAI Response: " + JSON.stringify(parseResponse, null, 2));

      // 3. Show what would be saved to DB
      const dbPayload = {
        extracted_skills: parseResponse?.skills || [],
        experience: parseResponse?.experience || '',
        preferred_locations: parseResponse?.preferredLocations || [],
        preferred_companies: parseResponse?.preferredCompanies || [],
        status: 'processed'
      };

      setDebugInfo(prev => prev + "\n\nDB Payload that would be saved: " + JSON.stringify(dbPayload, null, 2));

      toast({
        title: "Debug Process Complete",
        description: "Check the debug information below",
      });

    } catch (error) {
      console.error('Debug error:', error);
      toast({
        variant: "destructive",
        title: "Debug Process Failed",
        description: error instanceof Error ? error.message : "An error occurred during debugging",
      });
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
        <FileText className="w-4 h-4" />
        {file.name}
      </div>
      {!isAuthenticated && (
        <p className="text-sm text-primary bg-primary/5 p-3 rounded-lg text-center">
          Click upload to continue. You'll be asked to create an account to save your resume and get personalized job matches.
        </p>
      )}
      <Button 
        onClick={onUpload} 
        disabled={isUploading}
        className="w-full bg-primary hover:bg-primary/90"
      >
        {isUploading ? (
          <span className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {isUploading ? "Processing Resume..." : "Uploading..."}
          </span>
        ) : (
          "Upload Resume"
        )}
      </Button>

      {/* Temporary Debug Section */}
      <div className="border-t pt-4 mt-4">
        <Button 
          onClick={testParseResume}
          variant="outline"
          className="w-full"
        >
          <Bug className="w-4 h-4 mr-2" />
          Test Parse (Debug)
        </Button>
        
        {debugInfo && (
          <div className="mt-4 p-4 bg-secondary/10 rounded-lg">
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-60">
              {debugInfo}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUploadForm;


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEmbeddings } from "@/hooks/use-embeddings";
import { AlertCircle, CheckCircle } from "lucide-react";

const EmbeddingTest = () => {
  const [testText, setTestText] = useState<string>("This is a sample text to test the embedding functionality.");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [functionStatus, setFunctionStatus] = useState<boolean | null>(null);
  const [statusChecking, setStatusChecking] = useState<boolean>(false);

  const { testEmbeddingFunction, generateSingleEmbedding } = useEmbeddings();

  const checkFunctionStatus = async () => {
    setStatusChecking(true);
    setError(null);
    try {
      const status = await testEmbeddingFunction();
      setFunctionStatus(status);
    } catch (err) {
      setError("Error checking function status: " + (err instanceof Error ? err.message : String(err)));
      setFunctionStatus(false);
    } finally {
      setStatusChecking(false);
    }
  };

  const generateEmbedding = async () => {
    if (!testText.trim()) {
      setError("Please provide some text to generate embeddings.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const embedding = await generateSingleEmbedding(testText);
      
      if (!embedding) {
        throw new Error("Failed to generate embedding");
      }
      
      setResult({
        embedding,
        dimensions: embedding.length,
        sample: embedding.slice(0, 5).map(num => num.toFixed(6))
      });
    } catch (err) {
      setError("Error generating embedding: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Embedding Service Test</CardTitle>
        <CardDescription>
          Test the Gemini embedding service by generating embeddings for sample text
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-medium">Edge Function Status</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkFunctionStatus}
              disabled={statusChecking}
            >
              {statusChecking ? "Checking..." : "Check Status"}
            </Button>
          </div>

          {functionStatus !== null && (
            <Alert variant={functionStatus ? "default" : "destructive"}>
              {functionStatus ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Success</AlertTitle>
                  <AlertDescription>
                    The embedding function is working properly.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    The embedding function is not accessible or not working.
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Test Text</h3>
          <Textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Enter text to generate embeddings"
            rows={4}
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
            <h3 className="font-medium">Embedding Result:</h3>
            <div className="text-sm">
              <p><span className="font-semibold">Dimensions:</span> {result.dimensions}</p>
              <p><span className="font-semibold">Sample values:</span> [{result.sample.join(", ")}...]</p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm text-blue-600">View full embedding</summary>
              <pre className="text-xs mt-2 bg-slate-100 p-2 rounded overflow-auto max-h-60">
                {JSON.stringify(result.embedding, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button 
          onClick={generateEmbedding} 
          disabled={isLoading || !testText.trim()}
          className="w-full"
        >
          {isLoading ? "Generating..." : "Generate Embedding"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default EmbeddingTest;

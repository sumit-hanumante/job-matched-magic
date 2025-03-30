
import { useState, useEffect } from "react";

export const useConsoleCapture = (isCapturing: boolean, onErrorDetected?: (error: string) => void) => {
  const [capturedOutput, setCapturedOutput] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    if (isCapturing) {
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        
        setCapturedOutput(prev => prev + message + "\n");
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        const message = args.map(arg => 
          typeof arg === 'object' && arg instanceof Error
            ? `${arg.name}: ${arg.message}`
            : typeof arg === 'object' 
              ? JSON.stringify(arg, null, 2) 
              : String(arg)
        ).join(' ');
        
        setCapturedOutput(prev => prev + "ERROR: " + message + "\n");
        
        // Extract error for UI display
        if (args[0] === "Upload process error:" && args[1]) {
          const errorMessage = typeof args[1] === 'object' 
            ? (args[1].message || JSON.stringify(args[1])) 
            : String(args[1]);
            
          setErrorDetails(errorMessage);
          if (onErrorDetected) onErrorDetected(errorMessage);
        }
      };
      
      return () => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
      };
    }
  }, [isCapturing, onErrorDetected]);

  const resetErrorDetails = () => {
    setErrorDetails(null);
  };

  const resetOutput = () => {
    setCapturedOutput("");
  };

  return { capturedOutput, errorDetails, resetErrorDetails, resetOutput };
};

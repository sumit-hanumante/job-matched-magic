
import { useState, useEffect } from "react";

export const useUploadProgress = (isUploading: boolean) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    let intervalId: number;
    
    if (isUploading) {
      setUploadProgress(0);
      intervalId = window.setInterval(() => {
        setUploadProgress(prev => {
          // Go up to 90%, the last 10% is for server processing
          if (prev >= 90) return prev;
          return prev + Math.random() * 15;
        });
      }, 500);
    } else if (uploadProgress > 0) {
      // Set to 100% when done
      setUploadProgress(100);
      
      // Reset after showing complete
      const timeout = setTimeout(() => {
        setUploadProgress(0);
      }, 1500);
      
      return () => clearTimeout(timeout);
    }
    
    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isUploading, uploadProgress]);

  return { uploadProgress };
};

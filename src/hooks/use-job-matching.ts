
import { useCallback, useState } from 'react';
import { processJobMatching } from '@/lib/jobMatcher';
import { useToast } from '@/hooks/use-toast';

export const useJobMatching = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const generateJobMatches = useCallback(async (resumeId: string) => {
    if (!resumeId) {
      console.error('No resume ID provided for job matching');
      return false;
    }

    try {
      setIsProcessing(true);
      
      console.log(`Starting job matching process for resume ${resumeId}`);
      await processJobMatching(resumeId);
      
      toast({
        title: 'Job matching completed',
        description: 'Your personalized job matches are ready to view'
      });
      
      return true;
    } catch (error) {
      console.error('Error in job matching process:', error);
      toast({
        title: 'Job matching failed',
        description: error instanceof Error ? error.message : 'An error occurred while matching jobs',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return { isProcessing, generateJobMatches };
};

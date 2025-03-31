
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
      
      // Display a more specific error message for database constraint violations
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        toast({
          title: 'Job matches already exist',
          description: 'Some job matches were not created because they already exist',
          variant: 'default'
        });
        // Return true since this is not a critical error
        return true;
      } else {
        toast({
          title: 'Job matching failed',
          description: error instanceof Error ? error.message : 'An error occurred while matching jobs',
          variant: 'destructive'
        });
        return false;
      }
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  return { isProcessing, generateJobMatches };
};

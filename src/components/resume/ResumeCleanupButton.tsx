
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cleanupAllResumes } from "@/lib/resume-utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResumeCleanupButtonProps {
  userId: string;
  onCleanupComplete: () => void;
}

const ResumeCleanupButton = ({ userId, onCleanupComplete }: ResumeCleanupButtonProps) => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const handleCleanupResumes = async () => {
    if (!userId) return;
    
    setIsCleaningUp(true);
    try {
      const success = await cleanupAllResumes(userId);
      if (success) {
        toast({
          title: "Cleanup successful",
          description: "All your resumes have been removed.",
        });
        onCleanupComplete();
      } else {
        toast({
          variant: "destructive",
          title: "Cleanup failed",
          description: "Failed to clean up resumes. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Cleanup failed",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  return (
    <div className="mt-4 flex justify-end">
      <Button 
        variant="destructive" 
        size={isMobile ? "sm" : "default"}
        onClick={handleCleanupResumes}
        disabled={isCleaningUp}
        className="flex items-center gap-2 h-9 text-xs sm:text-sm"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isCleaningUp ? 'Cleaning...' : 'Remove All Resumes'}
      </Button>
    </div>
  );
};

export default ResumeCleanupButton;

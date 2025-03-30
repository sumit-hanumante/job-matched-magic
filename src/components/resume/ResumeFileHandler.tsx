
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ResumeFileHandlerProps {
  onFileSelected: (file: File) => void;
  children: (props: {
    isDragging: boolean;
    handleDragOver: (e: React.DragEvent) => void;
    handleDragLeave: () => void;
    handleDrop: (e: React.DragEvent) => void;
    handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => React.ReactNode;
}

const ResumeFileHandler = ({ onFileSelected, children }: ResumeFileHandlerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    validateAndSetFile(selectedFile);
    
    // Clean up the input value to allow selecting the same file again
    if (e.target.value) {
      e.target.value = '';
    }
  };

  const validateAndSetFile = (selectedFile?: File) => {
    if (selectedFile && (selectedFile.type === "application/pdf" || 
        selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      onFileSelected(selectedFile);
    } else if (selectedFile) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: "Please upload a PDF or Word document"
      });
    }
  };

  return children({
    isDragging,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileInput,
  });
};

export default ResumeFileHandler;

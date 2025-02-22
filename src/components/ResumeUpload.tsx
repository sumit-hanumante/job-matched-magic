
import { useState } from "react";
import { Upload } from "lucide-react";

const ResumeUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);

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
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document")) {
      setFile(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          glass-card
          p-8
          rounded-xl
          text-center
          transition-all
          duration-300
          ${isDragging ? "border-primary border-2" : "border border-dashed border-gray-300"}
        `}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h3 className="text-lg font-semibold mb-2">Upload Your Resume</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Drop your PDF or DOCX file here, or click to browse
        </p>
        
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".pdf,.docx"
          onChange={handleFileInput}
        />
        
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Choose File
        </label>

        {file && (
          <div className="mt-4 text-sm text-muted-foreground">
            Selected file: {file.name}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;

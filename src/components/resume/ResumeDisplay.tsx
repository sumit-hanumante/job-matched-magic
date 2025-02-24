
import { FileText } from "lucide-react";

interface ResumeDisplayProps {
  filename: string;
  uploadedAt: string;
  status: string;
}

const ResumeDisplay = ({ filename, uploadedAt, status }: ResumeDisplayProps) => {
  return (
    <div className="mb-6 p-4 bg-muted rounded-lg">
      <h4 className="font-medium mb-2">Current Resume</h4>
      <p className="text-sm text-muted-foreground">
        {filename}
      </p>
      <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
        <span>Uploaded: {uploadedAt}</span>
        <span className="capitalize">Status: {status}</span>
      </div>
    </div>
  );
};

export default ResumeDisplay;

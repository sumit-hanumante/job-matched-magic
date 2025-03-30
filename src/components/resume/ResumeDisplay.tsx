
import { FileCheck, RefreshCw, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResumeDisplayProps {
  filename: string;
  uploadedAt: string;
  status: string;
  onUpdateClick?: () => void;
  isPrimary?: boolean;
}

const ResumeDisplay = ({ filename, uploadedAt, status, onUpdateClick, isPrimary = true }: ResumeDisplayProps) => {
  return (
    <div className="mb-6 p-6 bg-secondary rounded-xl border border-secondary shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <FileCheck className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-lg">
          {isPrimary ? 'Current Resume' : 'Secondary Resume'}
        </h4>
        {isPrimary && (
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        )}
      </div>
      <p className="text-sm mb-2">
        {filename}
      </p>
      <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
        <span>Uploaded: {uploadedAt}</span>
        <div className="flex items-center gap-2">
          {status === 'pending' ? (
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
          ) : null}
          <span className="capitalize">Status: {status}</span>
        </div>
      </div>
      {onUpdateClick && (
        <Button
          onClick={onUpdateClick}
          variant="outline"
          className="w-full mt-4"
        >
          Update Resume
        </Button>
      )}
    </div>
  );
};

export default ResumeDisplay;

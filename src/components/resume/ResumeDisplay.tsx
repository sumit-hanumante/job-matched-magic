
import { FileCheck, RefreshCw, Star, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ResumeDisplayProps {
  filename: string;
  uploadedAt: string;
  status: string;
  onUpdateClick?: () => void;
  isPrimary?: boolean;
}

const ResumeDisplay = ({ 
  filename, 
  uploadedAt, 
  status, 
  onUpdateClick, 
  isPrimary = true 
}: ResumeDisplayProps) => {
  // Format the date nicely if it's a valid date string
  const formattedDate = () => {
    try {
      const date = new Date(uploadedAt);
      if (!isNaN(date.getTime())) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
      return uploadedAt;
    } catch {
      return uploadedAt;
    }
  };
  
  // Status color mapping
  const statusColor = () => {
    switch (status.toLowerCase()) {
      case 'parsed':
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'failed':
      case 'error':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-5 sm:p-6 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="h-10 w-10 rounded-full bg-primary-50 flex items-center justify-center">
            <FileCheck className="w-5 h-5 text-primary-600" />
          </div>
          <div className="flex flex-col">
            <h4 className="font-semibold text-sm sm:text-base text-slate-800">
              {isPrimary ? 'Primary Resume' : 'Secondary Resume'}
            </h4>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              <span>{formattedDate()}</span>
            </div>
          </div>
        </div>
        
        {isPrimary && (
          <div className="rounded-full bg-amber-50 px-2 py-1 flex items-center gap-1 self-start sm:self-auto text-xs text-amber-700 border border-amber-200">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span>Main Profile</span>
          </div>
        )}
        
        <div className={cn(
          "rounded-full px-2 py-0.5 text-xs ml-0 sm:ml-auto flex items-center gap-1 capitalize",
          statusColor()
        )}>
          {status === 'pending' && <RefreshCw className="w-3 h-3 animate-spin" />}
          Status: {status}
        </div>
      </div>
      
      <div className="border border-slate-100 rounded-md p-3 bg-slate-50 mb-4">
        <p className="text-sm text-slate-700 truncate" title={filename}>
          {filename || "resume.pdf"}
        </p>
      </div>
      
      {onUpdateClick && (
        <Button
          onClick={onUpdateClick}
          variant="outline"
          className="w-full h-9 text-sm font-medium"
        >
          Update Resume
        </Button>
      )}
    </div>
  );
};

export default ResumeDisplay;

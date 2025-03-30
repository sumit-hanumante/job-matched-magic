
import { AlertCircle } from 'lucide-react';

interface JobListErrorProps {
  error: string | null;
}

export const JobListError = ({ error }: JobListErrorProps) => {
  if (!error) return null;
  
  return (
    <div className="p-4 border border-red-200 bg-red-50 rounded-md flex items-center gap-2">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <p className="text-sm text-red-600">Error while fetching jobs: {error}</p>
    </div>
  );
};

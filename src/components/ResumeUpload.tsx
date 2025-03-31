
import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ResumeUploadManager = lazy(() => import("./resume/ResumeUploadManager"));

interface ResumeUploadProps {
  onLoginRequired?: (email?: string, fullName?: string) => void;
}

const ResumeUpload = ({ onLoginRequired }: ResumeUploadProps) => {
  return (
    <div className="w-full">
      <Suspense 
        fallback={
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-slate-200 rounded-md w-1/3 mx-auto"></div>
            <div className="h-60 bg-slate-200 rounded-xl"></div>
          </div>
        }
      >
        <ResumeUploadManager onLoginRequired={onLoginRequired} />
      </Suspense>
    </div>
  );
};

export default ResumeUpload;

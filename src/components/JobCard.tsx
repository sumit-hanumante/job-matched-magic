
import { Job } from "@/lib/types";
import { ArrowUpRight, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

// Source color mapping in a separate constant
const sourceColors: { [key: string]: string } = {
  linkedin: "text-blue-600",
  google: "text-red-500",
  amazon: "text-orange-500",
  microsoft: "text-blue-500",
  apple: "text-gray-700",
  remoteok: "text-green-600",
  github: "text-purple-600",
  adzuna: "text-blue-500",
  arbeitnow: "text-indigo-600",
  default: "text-gray-600"
};

// Utility function to strip HTML
const stripHtml = (html: string): string => {
  if (!html) return "";
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent || temp.innerText || "";
};

// Component for the job metadata (match score and source)
const JobMetadata = ({ matchScore, source }: { matchScore: number; source: string }) => {
  const sourceColor = sourceColors[source?.toLowerCase()] || sourceColors.default;
  
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center px-3 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full">
        {Math.round(matchScore || 0)}% Match
      </span>
      <span className={cn("text-xs font-medium capitalize inline-flex items-center px-2 py-1 rounded-full bg-slate-50", sourceColor)}>
        via {source}
      </span>
    </div>
  );
};

// Component for job header (title and company)
const JobHeader = ({ title, company }: { title: string; company: string }) => (
  <div className="space-y-1.5">
    <h3 className="text-lg font-semibold text-slate-900">
      {title}
    </h3>
    <p className="text-sm font-medium text-slate-600">
      {company}
    </p>
  </div>
);

// Component for job details (location and salary)
const JobDetails = ({ location, salaryRange }: { location?: string; salaryRange?: string }) => (
  <div className="flex items-center gap-4 text-sm text-slate-600">
    {location && (
      <span className="flex items-center gap-1.5">
        <MapPin className="h-4 w-4 text-slate-400" />
        {location}
      </span>
    )}
    {salaryRange && (
      <span className="flex items-center gap-1.5">
        <DollarSign className="h-4 w-4 text-slate-400" />
        {salaryRange}
      </span>
    )}
  </div>
);

// Component for job requirements
const JobRequirements = ({ requirements }: { requirements?: string[] }) => {
  if (!requirements?.length) return null;
  
  return (
    <div className="flex flex-wrap gap-2">
      {requirements.slice(0, 3).map((req, index) => (
        <span 
          key={index}
          className="text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors duration-200"
        >
          {req}
        </span>
      ))}
      {requirements.length > 3 && (
        <span className="text-xs text-slate-500">
          +{requirements.length - 3} more
        </span>
      )}
    </div>
  );
};

// Main JobCard component
const JobCard = ({ job, onClick }: JobCardProps) => {
  if (!job || !job.title) return null;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (job.applyUrl) {
      window.open(job.applyUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Get clean description
  const truncatedDescription = (() => {
    const cleanDescription = stripHtml(job.description || "");
    return cleanDescription.length > 200 
      ? cleanDescription.slice(0, 200).trim() + '...'
      : cleanDescription;
  })();

  return (
    <div className="group relative bg-white p-6 rounded-xl border border-slate-200 h-full flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-slate-300">
      <div className="space-y-4">
        <JobMetadata matchScore={job.matchScore} source={job.source} />
        <JobHeader title={job.title} company={job.company} />
        <JobDetails location={job.location} salaryRange={job.salaryRange} />
        <p className="text-sm text-slate-600 line-clamp-3">
          {truncatedDescription}
        </p>
      </div>
      
      <div className="pt-4 mt-4 border-t border-slate-100 space-y-4">
        <JobRequirements requirements={job.requirements} />
        <div className="flex justify-end">
          <Button
            onClick={handleClick}
            size="sm"
            variant="default"
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            Apply Now
            <ArrowUpRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;

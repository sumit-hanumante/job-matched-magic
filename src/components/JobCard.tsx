
import { Job } from "@/lib/types";
import { ArrowUpRight, Building2, MapPin, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

const sourceColors: { [key: string]: string } = {
  linkedin: "text-blue-600",
  google: "text-red-500",
  amazon: "text-orange-500",
  microsoft: "text-blue-500",
  apple: "text-gray-700",
  remoteok: "text-green-600",
  github: "text-purple-600",
  default: "text-gray-600"
};

const JobCard = ({ job, onClick }: JobCardProps) => {
  const sourceColor = sourceColors[job.source.toLowerCase()] || sourceColors.default;
  
  // Strip HTML tags and decode HTML entities
  const stripHtml = (html: string) => {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || "";
  };
  
  // Clean and truncate description
  const cleanDescription = stripHtml(job.description);
  const truncatedDescription = cleanDescription.length > 200 
    ? cleanDescription.slice(0, 200).trim() + '...'
    : cleanDescription;

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 h-[400px] flex flex-col justify-between overflow-hidden">
      <div className="space-y-4 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {Math.round(job.matchScore)}% Match
          </span>
          <span className={cn("text-xs font-medium capitalize", sourceColor)}>
            via {job.source}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 min-h-[3.5rem]">
          {job.title}
        </h3>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{job.company}</span>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </p>
          {job.salaryRange && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
              <DollarSign className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{job.salaryRange}</span>
            </p>
          )}
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-3">
          {truncatedDescription}
        </p>
      </div>
      
      <div className="space-y-4">
        {job.requirements && job.requirements.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.requirements.slice(0, 3).map((req, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full truncate max-w-[150px]"
              >
                {req}
              </span>
            ))}
            {job.requirements.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{job.requirements.length - 3} more
              </span>
            )}
          </div>
        )}
        
        <Button
          onClick={onClick}
          className="w-full bg-primary hover:bg-primary/90 text-white"
          size="sm"
        >
          <span className="inline-flex items-center gap-1">
            Apply Now
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
    </div>
  );
};

export default JobCard;

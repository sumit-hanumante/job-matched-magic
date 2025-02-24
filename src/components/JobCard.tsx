
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
    <div className="group bg-white p-6 rounded-xl border border-gray-200/60 h-full flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 hover:bg-gray-50/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {Math.round(job.matchScore)}% Match
          </span>
          <span className={cn("text-xs font-medium capitalize px-2 py-1 rounded-full bg-gray-50", sourceColor)}>
            via {job.source}
          </span>
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors duration-200">
            {job.title}
          </h3>
          <p className="text-sm font-medium text-muted-foreground">
            {job.company}
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4 text-gray-400" />
            {job.location}
          </span>
          {job.salaryRange && (
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-gray-400" />
              {job.salaryRange}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 line-clamp-3">
          {truncatedDescription}
        </p>
      </div>
      
      <div className="pt-4 mt-4 border-t space-y-4">
        {job.requirements && job.requirements.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {job.requirements.slice(0, 3).map((req, index) => (
              <span 
                key={index}
                className="text-xs px-2.5 py-1 rounded-full border border-gray-100 bg-gray-50/50 text-gray-600 hover:bg-gray-100 transition-colors duration-200"
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
        
        <div className="flex justify-end">
          <Button
            onClick={onClick}
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-all duration-200 hover:shadow-md hover:translate-y-[-1px] hover:ring-2 hover:ring-emerald-500/20"
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

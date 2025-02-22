
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
  
  // Limit description to roughly 4 lines (assuming average of 60 chars per line)
  const truncatedDescription = job.description.length > 240 
    ? job.description.slice(0, 240).trim() + '...'
    : job.description;

  return (
    <div className="glass-card p-6 rounded-lg transition-all duration-300 hover:shadow-xl slide-up h-[380px] flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
            {Math.round(job.matchScore)}% Match
          </span>
          <span className={cn("text-xs font-medium capitalize", sourceColor)}>
            via {job.source}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{job.title}</h3>
        
        <div className="space-y-1 mb-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {job.company}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {job.location}
          </p>
          {job.salaryRange && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {job.salaryRange}
            </p>
          )}
        </div>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-4">
          {truncatedDescription}
        </p>
      </div>
      
      <div>
        {job.requirements && job.requirements.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {job.requirements.slice(0, 3).map((req, index) => (
              <span 
                key={index}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
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

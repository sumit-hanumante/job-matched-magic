
import { Job } from "@/lib/types";
import { ArrowUpRight, Briefcase, MapPin, Building2, DollarSign } from "lucide-react";
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

  return (
    <div className="glass-card p-6 rounded-lg transition-all duration-300 hover:shadow-xl slide-up">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
              {Math.round(job.matchScore)}% Match
            </span>
            <span className={cn("text-xs font-medium capitalize", sourceColor)}>
              via {job.source}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
          <div className="space-y-1">
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
        </div>
        <Button
          onClick={onClick}
          className="bg-primary hover:bg-primary/90 text-white"
          size="sm"
        >
          <span className="inline-flex items-center gap-1">
            Apply Now
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </Button>
      </div>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>
      
      {job.requirements && job.requirements.length > 0 && (
        <div className="flex flex-wrap gap-2">
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
    </div>
  );
};

export default JobCard;

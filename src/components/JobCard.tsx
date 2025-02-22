
import { Job } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

const JobCard = ({ job, onClick }: JobCardProps) => {
  return (
    <div className="glass-card p-6 rounded-lg transition-all duration-300 hover:shadow-xl slide-up">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="inline-block px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-2">
            {Math.round(job.matchScore)}% Match
          </span>
          <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
          <p className="text-sm text-muted-foreground">{job.company}</p>
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
      
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>{job.location}</span>
        <span>Source: {job.source}</span>
      </div>
      {job.salaryRange && (
        <p className="text-xs text-muted-foreground mt-2">Salary: {job.salaryRange}</p>
      )}
    </div>
  );
};

export default JobCard;

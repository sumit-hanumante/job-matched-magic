
import { Job } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobCardProps {
  job: Job;
}

const JobCard = ({ job }: JobCardProps) => {
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
      </div>
      
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{job.description}</p>
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>{job.location}</span>
          <span>Source: {job.source}</span>
        </div>
        {job.salaryRange && (
          <p className="text-xs text-muted-foreground">Salary: {job.salaryRange}</p>
        )}
        <Button
          asChild
          variant="outline"
          className="w-full mt-2"
        >
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1"
          >
            Apply Now
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default JobCard;

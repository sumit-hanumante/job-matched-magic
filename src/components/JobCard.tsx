
import { Job } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";

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
      
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{job.location}</span>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Apply Now
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
};

export default JobCard;

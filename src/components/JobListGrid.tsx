
import { Job } from "@/lib/types";
import JobCard from "./JobCard";

interface JobListGridProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

export const JobListGrid = ({ jobs, onJobClick }: JobListGridProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {jobs.map((job) => (
        <JobCard 
          key={job.id} 
          job={job} 
          onClick={() => onJobClick(job)}
        />
      ))}
    </div>
  );
};

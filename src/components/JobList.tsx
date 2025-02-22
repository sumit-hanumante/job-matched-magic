
import { useState, useEffect } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";

interface JobListProps {
  jobs?: Job[];
}

const JobList = ({ jobs: propJobs }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (propJobs) {
      setJobs(propJobs);
      setIsLoading(false);
      return;
    }

    const fetchJobs = async () => {
      try {
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*');

        if (jobsError) throw jobsError;

        if (user) {
          const { data: matchesData, error: matchesError } = await supabase
            .from('job_matches')
            .select('job_id, match_score')
            .eq('user_id', user.id);

          if (matchesError) throw matchesError;

          const matchesMap = new Map(matchesData?.map(m => [m.job_id, m.match_score]));
          
          const jobsWithScores = jobsData?.map(job => ({
            ...job,
            matchScore: matchesMap.get(job.id) || 0,
            postedDate: new Date(job.posted_date).toISOString().split('T')[0]
          }));

          setJobs(jobsWithScores);
        } else {
          setJobs(jobsData?.map(job => ({
            ...job,
            matchScore: 0,
            postedDate: new Date(job.posted_date).toISOString().split('T')[0]
          })));
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [user, propJobs]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-lg border">
            <Skeleton className="h-6 w-2/3 mb-4" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-20 w-full mb-4" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sortedJobs = [...jobs].sort((a, b) => b.matchScore - a.matchScore);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sortedJobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
};

export default JobList;

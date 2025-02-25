
import { useState, useEffect } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { JobFilters } from "./JobFilters";
import { JobListHeader } from "./JobListHeader";

interface JobListProps {
  jobs?: Job[];
  onLoginRequired?: () => void;
}

interface SourceCount {
  source: string;
  count: number;
}

const INITIAL_JOB_LIMIT = 10;
const ADMIN_EMAIL = 'tes@gmail.com'; // TODO: Move this to env variable

const JobList = ({ jobs: propJobs, onLoginRequired }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<SourceCount[]>([]);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("software developer");
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleJobClick = (job: Job) => {
    if (!user) {
      if (onLoginRequired) {
        onLoginRequired();
        localStorage.setItem('lastViewedJob', job.id);
      }
      return;
    }
    window.open(job.applyUrl, '_blank');
  };

  const scrapeJobs = async () => {
    if (!isAdmin) return;
    
    try {
      setIsScrapingJobs(true);
      setScrapingError(null);
      
      const response = await supabase.functions.invoke('scrape-jobs', {
        body: { jobType: selectedJobType }
      });
      
      if (response.error || response.data?.error) {
        throw new Error(response.error?.message || response.data?.error);
      }
      
      toast({
        title: "Jobs Updated",
        description: response.data?.message || "New jobs have been fetched successfully",
      });
      
      await fetchJobs();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch new jobs';
      setScrapingError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsScrapingJobs(false);
    }
  };

  const fetchJobs = async () => {
    try {
      let query = supabase.from('jobs').select('*');
      
      // For admin users, apply filters
      if (isAdmin) {
        if (selectedSource !== 'all') {
          query = query.eq('source', selectedSource);
        }
      } else {
        // For regular users, just get random 10 jobs
        query = query.limit(INITIAL_JOB_LIMIT);
      }

      // Get source counts for admin view
      if (isAdmin) {
        const { data: jobsData } = await supabase.from('jobs').select('*');
        
        if (jobsData) {
          const sourceCounts = jobsData.reduce<Record<string, number>>((acc, job) => {
            acc[job.source] = (acc[job.source] || 0) + 1;
            return acc;
          }, {});

          setUniqueSources(Object.entries(sourceCounts).map(([source, count]) => ({
            source,
            count
          })));
        }
      }

      // Get the actual jobs
      const { data: latestJobs, error: latestJobsError } = await query
        .order('posted_date', { ascending: false });

      if (latestJobsError) throw latestJobsError;

      const transformedJobs = latestJobs?.map(job => ({
        ...job,
        matchScore: 0, // TODO: Implement job matching
        postedDate: new Date(job.posted_date).toISOString().split('T')[0],
        applyUrl: job.apply_url,
        salaryRange: job.salary_range,
        lastScrapedAt: job.last_scraped_at
      })) || [];

      setJobs(transformedJobs);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch jobs.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (propJobs) {
      setJobs(propJobs);
      setIsLoading(false);
      return;
    }

    fetchJobs();
  }, [propJobs, selectedSource]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {isAdmin && (
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <JobListHeader 
              jobCount={jobs.length}
              selectedSource={selectedSource}
              lastUpdated={jobs[0]?.lastScrapedAt}
              activeSources={uniqueSources}
            />
            <JobFilters 
              selectedSource={selectedSource}
              selectedJobType={selectedJobType}
              onSourceChange={setSelectedSource}
              onJobTypeChange={setSelectedJobType}
              onRefresh={fetchJobs}
              onFetchJobs={scrapeJobs}
              isScrapingJobs={isScrapingJobs}
            />
          </div>
        )}
        {scrapingError && isAdmin && (
          <div className="p-4 border border-red-200 bg-red-50 rounded-md">
            <p className="text-sm text-red-600">Error while fetching new jobs: {scrapingError}</p>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobCard 
            key={job.id} 
            job={job} 
            onClick={() => handleJobClick(job)}
          />
        ))}
      </div>
    </div>
  );
};

export default JobList;

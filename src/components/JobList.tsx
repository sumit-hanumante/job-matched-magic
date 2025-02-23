
import { useState, useEffect } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface JobListProps {
  jobs?: Job[];
}

const INITIAL_JOB_LIMIT = 20;

const JobList = ({ jobs: propJobs }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJobClick = (job: Job) => {
    if (!user) {
      localStorage.setItem('lastViewedJob', job.id);
      toast({
        title: "Sign in required",
        description: "Please sign in or create an account to view job details",
      });
      navigate('/auth');
      return;
    }
    window.open(job.applyUrl, '_blank');
  };

  const scrapeJobs = async () => {
    try {
      setIsScrapingJobs(true);
      const response = await supabase.functions.invoke('scrape-jobs');
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast({
        title: "Jobs Updated",
        description: "New jobs have been fetched successfully",
      });
      
      // Refresh the jobs list
      await fetchJobs();
    } catch (error) {
      console.error('Error scraping jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch new jobs.",
        variant: "destructive"
      });
    } finally {
      setIsScrapingJobs(false);
    }
  };

  const fetchJobs = async () => {
    console.log('Fetching jobs...');
    try {
      // Get unique sources first using a separate query
      const sourcesQuery = await supabase
        .from('jobs')
        .select('source', { count: 'exact' })
        .limit(1000); // Get a reasonable number of rows
      
      if (sourcesQuery.data) {
        const sources = [...new Set(sourcesQuery.data.map(item => item.source))];
        setUniqueSources(sources);
        console.log('Unique job sources in database:', sources);
      }

      // For testing: Only fetch LinkedIn jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('source', 'linkedin') // Filter for LinkedIn jobs only
        .order('posted_date', { ascending: false })
        .limit(INITIAL_JOB_LIMIT);

      console.log('Jobs response:', { jobsData, jobsError });

      if (jobsError) throw jobsError;

      const transformedJobs = jobsData?.map(job => ({
        ...job,
        matchScore: 0,
        postedDate: new Date(job.posted_date).toISOString().split('T')[0],
        applyUrl: job.apply_url,
        salaryRange: job.salary_range,
        lastScrapedAt: job.last_scraped_at
      })) || [];

      console.log('Transformed jobs:', transformedJobs);
      setJobs(transformedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
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
  }, [propJobs]);

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
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {jobs.length} LinkedIn jobs found, last updated {" "}
            {jobs[0]?.lastScrapedAt ? new Date(jobs[0].lastScrapedAt).toLocaleString() : "never"}
          </p>
          <p className="text-xs text-muted-foreground">
            Available sources in database: {uniqueSources.join(', ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchJobs()}
            variant="outline"
          >
            Refresh Jobs
          </Button>
          <Button 
            onClick={() => scrapeJobs()}
            disabled={isScrapingJobs}
          >
            {isScrapingJobs ? "Fetching..." : "Fetch New Jobs"}
          </Button>
        </div>
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

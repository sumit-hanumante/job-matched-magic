
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
  const [uniqueSources, setUniqueSources] = useState<{ source: string; count: number }[]>([]);
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
      // Get count of jobs by source using a raw count query
      const { data: sourceCounts, error: sourceError } = await supabase
        .from('jobs')
        .select('source, count', {
          count: 'exact',
          head: false
        })
        .throwOnError();

      if (sourceError) throw sourceError;

      if (sourceCounts) {
        // Transform the data into the required format
        const sources = Object.entries(
          sourceCounts.reduce((acc: Record<string, number>, curr: any) => {
            acc[curr.source] = (acc[curr.source] || 0) + 1;
            return acc;
          }, {})
        ).map(([source, count]) => ({
          source,
          count: count as number
        }));
        
        setUniqueSources(sources);
        console.log('Job counts by source:', sources);
      }

      // Fetch all jobs from legal sources
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .in('source', ['remoteok', 'arbeitnow', 'adzuna'])
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

  const legalSources = ['remoteok', 'arbeitnow', 'adzuna'];
  const activeSources = uniqueSources.filter(s => legalSources.includes(s.source));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {jobs.length} jobs found from legal sources, last updated {" "}
            {jobs[0]?.lastScrapedAt ? new Date(jobs[0].lastScrapedAt).toLocaleString() : "never"}
          </p>
          <p className="text-xs text-muted-foreground">
            Sources: {activeSources.map(s => `${s.source} (${s.count})`).join(', ') || 'None'}
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

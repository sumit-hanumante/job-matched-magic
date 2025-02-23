
import { useState, useEffect } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface JobListProps {
  jobs?: Job[];
}

interface SourceCount {
  source: string;
  count: number;
}

const INITIAL_JOB_LIMIT = 20;
const JOB_TYPES = ["software developer", "medical coding"];

const JobList = ({ jobs: propJobs }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<SourceCount[]>([]);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("software developer");
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
      setScrapingError(null);
      
      console.log('Starting job scraping for:', selectedJobType);
      const response = await supabase.functions.invoke('scrape-jobs', {
        body: { jobType: selectedJobType }
      });
      
      if (response.error) {
        console.error('Scraping error:', response.error);
        throw new Error(response.error.message);
      }

      console.log('Scraping response:', response.data);
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      toast({
        title: "Jobs Updated",
        description: response.data?.message || "New jobs have been fetched successfully",
      });
      
      await fetchJobs();
    } catch (error) {
      console.error('Error scraping jobs:', error);
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
    console.log('Fetching jobs...');
    try {
      let query = supabase
        .from('jobs')
        .select('*');
      
      if (selectedSource !== 'all') {
        query = query.eq('source', selectedSource);
      } else {
        query = query.in('source', ['remoteok', 'arbeitnow', 'adzuna']);
      }

      const { data: jobsData, error: jobsError } = await query;

      if (jobsError) throw jobsError;

      if (jobsData) {
        const sourceCounts = jobsData.reduce<Record<string, number>>((acc, job) => {
          acc[job.source] = (acc[job.source] || 0) + 1;
          return acc;
        }, {});

        const sources: SourceCount[] = Object.entries(sourceCounts).map(([source, count]) => ({
          source,
          count: count
        }));
        
        setUniqueSources(sources);
        console.log('Job counts by source:', sources);
      }

      // Get the latest jobs for display
      let latestJobsQuery = supabase
        .from('jobs')
        .select('*')
        .order('posted_date', { ascending: false })
        .limit(INITIAL_JOB_LIMIT);

      if (selectedSource !== 'all') {
        latestJobsQuery = latestJobsQuery.eq('source', selectedSource);
      } else {
        latestJobsQuery = latestJobsQuery.in('source', ['remoteok', 'arbeitnow', 'adzuna']);
      }

      const { data: latestJobs, error: latestJobsError } = await latestJobsQuery;

      if (latestJobsError) throw latestJobsError;

      const transformedJobs = latestJobs?.map(job => ({
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

  const legalSources = ['remoteok', 'arbeitnow', 'adzuna'];
  const activeSources = uniqueSources.filter(s => legalSources.includes(s.source));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {jobs.length} jobs found from {selectedSource === 'all' ? 'all' : selectedSource}, last updated {" "}
              {jobs[0]?.lastScrapedAt ? new Date(jobs[0].lastScrapedAt).toLocaleString() : "never"}
            </p>
            <p className="text-xs text-muted-foreground">
              Sources: {activeSources.map(s => `${s.source} (${s.count})`).join(', ') || 'None'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {legalSources.map(source => (
                  <SelectItem key={source} value={source}>{source}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedJobType} onValueChange={setSelectedJobType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        {scrapingError && (
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

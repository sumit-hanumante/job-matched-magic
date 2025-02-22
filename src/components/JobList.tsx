
import { useState, useEffect } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface JobListProps {
  jobs?: Job[];
}

const DAILY_JOB_LIMIT = 10;

const JobList = ({ jobs: propJobs }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const { user } = useAuth();

  const handleScrapeJobs = async () => {
    try {
      setIsScrapingJobs(true);
      toast({
        title: "Starting job scraping...",
        description: "This may take a few minutes"
      });

      const { data, error } = await supabase.functions.invoke('scrape-jobs');
      
      if (error) throw error;

      // Fetch the newly scraped jobs immediately
      const { data: newJobs, error: fetchError } = await supabase
        .from('jobs')
        .select('*')
        .order('posted_date', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform and set the jobs
      const transformedJobs = newJobs.map(job => ({
        ...job,
        matchScore: 0, // For testing, set match score to 0
        postedDate: new Date(job.posted_date).toISOString().split('T')[0],
        applyUrl: job.apply_url,
        salaryRange: job.salary_range,
        lastScrapedAt: job.last_scraped_at
      }));

      setJobs(transformedJobs);
      
      toast({
        title: "Success!",
        description: `${transformedJobs.length} jobs fetched successfully`
      });
      
    } catch (error) {
      console.error('Error scraping jobs:', error);
      toast({
        title: "Error",
        description: "Failed to scrape jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsScrapingJobs(false);
    }
  };

  const fetchJobs = async () => {
    try {
      if (!user) {
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .order('posted_date', { ascending: false });

        if (jobsError) throw jobsError;

        setJobs(jobsData?.map(job => ({
          ...job,
          matchScore: 0,
          postedDate: new Date(job.posted_date).toISOString().split('T')[0],
          applyUrl: job.apply_url,
          salaryRange: job.salary_range,
          lastScrapedAt: job.last_scraped_at
        })) || []);
        
        setIsLoading(false);
        return;
      }

      // For authenticated users, fetch unshown matches first
      const { data: matchesData, error: matchesError } = await supabase
        .from('job_matches')
        .select('*, jobs(*)')
        .eq('user_id', user.id)
        .eq('is_shown', false)
        .order('match_score', { ascending: false })
        .limit(DAILY_JOB_LIMIT);

      if (matchesError) throw matchesError;

      if (!matchesData?.length) {
        // If no unshown matches, fetch shown matches
        const { data: shownMatches, error: shownError } = await supabase
          .from('job_matches')
          .select('*, jobs(*)')
          .eq('user_id', user.id)
          .eq('is_shown', true)
          .order('match_score', { ascending: false });

        if (shownError) throw shownError;
        
        const jobsWithScores = shownMatches?.map(match => ({
          ...match.jobs,
          matchScore: match.match_score,
          postedDate: new Date(match.jobs.posted_date).toISOString().split('T')[0],
          applyUrl: match.jobs.apply_url,
          salaryRange: match.jobs.salary_range,
          lastScrapedAt: match.jobs.last_scraped_at
        })) || [];

        setJobs(jobsWithScores);
      } else {
        // Mark fetched jobs as shown
        const jobIds = matchesData.map(match => match.job_id);
        await supabase
          .from('job_matches')
          .update({ is_shown: true, viewed_at: new Date().toISOString() })
          .in('job_id', jobIds);

        const jobsWithScores = matchesData.map(match => ({
          ...match.jobs,
          matchScore: match.match_score,
          postedDate: new Date(match.jobs.posted_date).toISOString().split('T')[0],
          applyUrl: match.jobs.apply_url,
          salaryRange: match.jobs.salary_range,
          lastScrapedAt: match.jobs.last_scraped_at
        }));

        setJobs(jobsWithScores);
      }
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {jobs.length} jobs found, last updated {" "}
          {jobs[0]?.lastScrapedAt ? new Date(jobs[0].lastScrapedAt).toLocaleString() : "never"}
        </p>
        <Button 
          onClick={handleScrapeJobs}
          disabled={isScrapingJobs}
        >
          {isScrapingJobs ? "Scraping Jobs..." : "Scrape New Jobs"}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
};

export default JobList;

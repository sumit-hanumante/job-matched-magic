
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
const DAILY_JOB_LIMIT = 10;

const JobList = ({ jobs: propJobs }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const checkForResume = async () => {
    if (!user) return false;
    
    const { data } = await supabase
      .from('resumes')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    return !!data;
  };

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

    if (!hasResume) {
      toast({
        title: "Resume required",
        description: "Please upload your resume to get personalized job matches",
      });
      document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
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
      if (!user) {
        console.log('No user, fetching public jobs');
        const { data: jobsData, error: jobsError } = await supabase
          .from('jobs')
          .select('*')
          .order('posted_date', { ascending: false })
          .limit(INITIAL_JOB_LIMIT);

        console.log('Public jobs response:', { jobsData, jobsError });

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
        setIsLoading(false);
        return;
      }

      console.log('User logged in, checking for resume');
      const hasUploadedResume = await checkForResume();
      setHasResume(hasUploadedResume);

      if (!hasUploadedResume) {
        console.log('No resume, fetching random jobs');
        const { data: randomJobs, error: randomError } = await supabase
          .from('jobs')
          .select('*')
          .order('posted_date', { ascending: false })
          .limit(INITIAL_JOB_LIMIT);

        console.log('Random jobs response:', { randomJobs, randomError });

        if (randomError) throw randomError;

        const transformedJobs = randomJobs?.map(job => ({
          ...job,
          matchScore: 0,
          postedDate: new Date(job.posted_date).toISOString().split('T')[0],
          applyUrl: job.apply_url,
          salaryRange: job.salary_range,
          lastScrapedAt: job.last_scraped_at
        })) || [];

        console.log('Transformed random jobs:', transformedJobs);
        setJobs(transformedJobs);
        setIsLoading(false);
        return;
      }

      console.log('Has resume, fetching matched jobs');
      const { data: matchesData, error: matchesError } = await supabase
        .from('job_matches')
        .select('*, jobs(*)')
        .eq('user_id', user.id)
        .eq('is_shown', false)
        .order('match_score', { ascending: false })
        .limit(DAILY_JOB_LIMIT);

      console.log('Job matches response:', { matchesData, matchesError });

      if (matchesError) throw matchesError;

      if (!matchesData?.length) {
        console.log('No new matches, fetching previously shown matches');
        const { data: shownMatches, error: shownError } = await supabase
          .from('job_matches')
          .select('*, jobs(*)')
          .eq('user_id', user.id)
          .eq('is_shown', true)
          .order('match_score', { ascending: false });

        console.log('Shown matches response:', { shownMatches, shownError });

        if (shownError) throw shownError;
        
        const jobsWithScores = shownMatches?.map(match => ({
          ...match.jobs,
          matchScore: match.match_score,
          postedDate: new Date(match.jobs.posted_date).toISOString().split('T')[0],
          applyUrl: match.jobs.apply_url,
          salaryRange: match.jobs.salary_range,
          lastScrapedAt: match.jobs.last_scraped_at
        })) || [];

        console.log('Transformed shown matches:', jobsWithScores);
        setJobs(jobsWithScores);
      } else {
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

        console.log('Transformed new matches:', jobsWithScores);
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


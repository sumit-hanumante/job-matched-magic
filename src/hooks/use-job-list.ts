
import { useState, useEffect, useCallback, useMemo } from "react";
import { Job } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

export const JOBS_PER_PAGE = 15;
export const ADMIN_EMAIL = 'admin@jobmagic.com';

interface UseJobListProps {
  initialJobs?: Job[];
  user: any | null;
  onLoginRequired?: () => void;
}

export const useJobList = ({ initialJobs, user, onLoginRequired }: UseJobListProps) => {
  const [jobs, setJobs] = useState<Job[]>(initialJobs || []);
  const [isLoading, setIsLoading] = useState(!initialJobs);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<{source: string, count: number}[]>([]);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("software developer");
  const [currentPage, setCurrentPage] = useState(1);
  
  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleSourceChange = useCallback((source: string) => {
    console.log('Source changed to:', source);
    setSelectedSource(source);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleJobTypeChange = useCallback((type: string) => {
    console.log('Job type changed to:', type);
    setSelectedJobType(type);
    setCurrentPage(1); // Reset to first page when filter changes
  }, []);

  const handleJobClick = useCallback((job: Job) => {
    if (!user) {
      if (onLoginRequired) {
        onLoginRequired();
        localStorage.setItem('lastViewedJob', job.id);
      }
      return;
    }
    window.open(job.applyUrl, '_blank');
  }, [user, onLoginRequired]);

  const fetchJobs = useCallback(async () => {
    console.log("Fetching jobs with source:", selectedSource);
    setIsLoading(true);
    
    try {
      let query = supabase.from('jobs').select('*');
      
      if (selectedSource !== 'all') {
        query = query.eq('source', selectedSource);
      }

      const { data: jobsData, error } = await query
        .order('posted_date', { ascending: false })
        .limit(50); // Fetch more than we show per page to reduce subsequent API calls

      if (error) throw error;

      const transformedJobs = jobsData?.map(job => ({
        ...job,
        matchScore: 0,
        postedDate: new Date(job.posted_date).toISOString().split('T')[0],
        applyUrl: job.apply_url,
        salaryRange: job.salary_range,
        lastScrapedAt: job.last_scraped_at
      })) || [];

      setJobs(transformedJobs);
      
      if (isAdmin) {
        const sourceCounts = jobsData?.reduce<Record<string, number>>((acc, job) => {
          acc[job.source] = (acc[job.source] || 0) + 1;
          return acc;
        }, {}) || {};

        setUniqueSources(Object.entries(sourceCounts).map(([source, count]) => ({
          source,
          count
        })));
      }

      toast({
        title: "Success",
        description: "Jobs refreshed successfully",
      });
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
  }, [selectedSource, isAdmin]);

  const handleFetchNewJobs = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      setIsScrapingJobs(true);
      setScrapingError(null);
      
      console.log("Fetching new jobs with type:", selectedJobType);
      
      const { data, error } = await supabase.functions.invoke('scrape-jobs', {
        body: { jobType: selectedJobType }
      });
      
      if (error || data?.error) {
        throw new Error(error?.message || data?.error);
      }
      
      toast({
        title: "Success",
        description: "New jobs have been fetched successfully",
      });
      
      await fetchJobs();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch new jobs';
      console.error('Error scraping jobs:', errorMessage);
      setScrapingError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsScrapingJobs(false);
    }
  }, [selectedJobType, isAdmin, fetchJobs]);

  // Initial load
  useEffect(() => {
    if (initialJobs) {
      setJobs(initialJobs);
      setIsLoading(false);
    } else {
      fetchJobs();
    }
  }, [initialJobs, fetchJobs]);

  // Fetch jobs when source changes
  useEffect(() => {
    if (!initialJobs) {
      fetchJobs();
    }
  }, [selectedSource, initialJobs, fetchJobs]);

  // Memoize the paginated jobs to prevent unnecessary re-renders
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return jobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [jobs, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);

  return {
    jobs,
    paginatedJobs,
    isLoading,
    isScrapingJobs,
    scrapingError,
    selectedSource,
    selectedJobType,
    uniqueSources,
    currentPage,
    totalPages,
    isAdmin,
    handleSourceChange,
    handleJobTypeChange,
    handleJobClick,
    fetchJobs,
    handleFetchNewJobs,
    setCurrentPage,
  };
};

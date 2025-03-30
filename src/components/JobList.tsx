
import { useState, useEffect, useCallback, useMemo } from "react";
import { Job } from "@/lib/types";
import JobCard from "./JobCard";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { JobFilters } from "./JobFilters";
import { JobListHeader } from "./JobListHeader";
import { Button } from "@/components/ui/button";

interface JobListProps {
  jobs?: Job[];
  onLoginRequired?: () => void;
}

interface SourceCount {
  source: string;
  count: number;
}

const JOBS_PER_PAGE = 15;
const ADMIN_EMAIL = 'admin@jobmagic.com';

const JobList = ({ jobs: propJobs, onLoginRequired }: JobListProps) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScrapingJobs, setIsScrapingJobs] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<SourceCount[]>([]);
  const [scrapingError, setScrapingError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [selectedJobType, setSelectedJobType] = useState<string>("software developer");
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
    if (propJobs) {
      setJobs(propJobs);
      setIsLoading(false);
    } else {
      fetchJobs();
    }
  }, [propJobs, fetchJobs]);

  // Fetch jobs when source changes
  useEffect(() => {
    if (!propJobs) {
      fetchJobs();
    }
  }, [selectedSource, propJobs, fetchJobs]);

  // Memoize the paginated jobs to prevent unnecessary re-renders
  const paginatedJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return jobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [jobs, currentPage]);

  // Calculate total pages
  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);

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
              onSourceChange={handleSourceChange}
              onJobTypeChange={handleJobTypeChange}
              onRefresh={fetchJobs}
              onFetchJobs={handleFetchNewJobs}
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
        {paginatedJobs.map((job) => (
          <JobCard 
            key={job.id} 
            job={job} 
            onClick={() => handleJobClick(job)}
          />
        ))}
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-8 gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default JobList;

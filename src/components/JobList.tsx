
import { useAuth } from "@/components/AuthProvider";
import { useJobList } from "@/hooks/use-job-list";
import { JobListSkeleton } from "./JobListSkeleton";
import { JobFilters } from "./JobFilters";
import { JobListHeader } from "./JobListHeader";
import { JobListError } from "./JobListError";
import { JobListGrid } from "./JobListGrid";
import { JobPagination } from "./JobPagination";
import { Job } from "@/lib/types";

interface JobListProps {
  jobs?: Job[];
  onLoginRequired?: () => void;
}

const JobList = ({ jobs: propJobs, onLoginRequired }: JobListProps) => {
  const { user } = useAuth();
  
  const {
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
  } = useJobList({ 
    initialJobs: propJobs, 
    user, 
    onLoginRequired 
  });

  if (isLoading) {
    return <JobListSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {isAdmin && (
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <JobListHeader 
              jobCount={paginatedJobs.length}
              selectedSource={selectedSource}
              lastUpdated={paginatedJobs[0]?.lastScrapedAt}
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
        <JobListError error={scrapingError && isAdmin ? scrapingError : null} />
      </div>
      
      <JobListGrid 
        jobs={paginatedJobs} 
        onJobClick={handleJobClick} 
      />
      
      <JobPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default JobList;

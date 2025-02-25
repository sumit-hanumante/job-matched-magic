
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface JobFiltersProps {
  selectedSource: string;
  selectedJobType: string;
  onSourceChange: (source: string) => void;
  onJobTypeChange: (type: string) => void;
  onRefresh: () => void;
  onFetchJobs: () => void;
  isScrapingJobs: boolean;
}

const JOB_TYPES = ["software developer", "medical coding"];
const LEGAL_SOURCES = ['remoteok', 'arbeitnow', 'adzuna'];

export const JobFilters = ({
  selectedSource,
  selectedJobType,
  onSourceChange,
  onJobTypeChange,
  onRefresh,
  onFetchJobs,
  isScrapingJobs
}: JobFiltersProps) => {
  const handleSourceChange = (value: string) => {
    console.log("Source changed to:", value);
    onSourceChange(value);
  };

  const handleJobTypeChange = (value: string) => {
    console.log("Job type changed to:", value);
    onJobTypeChange(value);
  };

  const handleRefreshClick = () => {
    console.log("Refresh clicked");
    onRefresh();
  };

  const handleFetchJobsClick = () => {
    console.log("Fetch jobs clicked");
    onFetchJobs();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select 
        defaultValue={selectedSource} 
        onValueChange={handleSourceChange}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {LEGAL_SOURCES.map(source => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        defaultValue={selectedJobType} 
        onValueChange={handleJobTypeChange}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue placeholder="Select job type" />
        </SelectTrigger>
        <SelectContent>
          {JOB_TYPES.map(type => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        onClick={handleRefreshClick}
        variant="outline"
        className="whitespace-nowrap"
      >
        Refresh Jobs
      </Button>

      <Button 
        onClick={handleFetchJobsClick}
        disabled={isScrapingJobs}
        className="whitespace-nowrap"
      >
        {isScrapingJobs ? "Fetching..." : "Fetch New Jobs"}
      </Button>
    </div>
  );
};

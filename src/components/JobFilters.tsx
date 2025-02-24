
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
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select value={selectedSource} onValueChange={onSourceChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {LEGAL_SOURCES.map(source => (
            <SelectItem key={source} value={source}>{source}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedJobType} onValueChange={onJobTypeChange}>
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
        onClick={onRefresh}
        variant="outline"
      >
        Refresh Jobs
      </Button>
      <Button 
        onClick={onFetchJobs}
        disabled={isScrapingJobs}
      >
        {isScrapingJobs ? "Fetching..." : "Fetch New Jobs"}
      </Button>
    </div>
  );
};

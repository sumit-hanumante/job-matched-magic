
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
      <Select 
        value={selectedSource}
        onValueChange={onSourceChange}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue defaultValue={selectedSource}>
            {selectedSource === 'all' ? 'All Sources' : selectedSource}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="all">All Sources</SelectItem>
          {LEGAL_SOURCES.map(source => (
            <SelectItem key={source} value={source}>
              {source}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={selectedJobType}
        onValueChange={onJobTypeChange}
      >
        <SelectTrigger className="w-[180px] bg-white">
          <SelectValue defaultValue={selectedJobType}>
            {selectedJobType}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white">
          {JOB_TYPES.map(type => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button 
        onClick={onRefresh}
        variant="outline"
        className="whitespace-nowrap"
      >
        Refresh Jobs
      </Button>

      <Button 
        onClick={onFetchJobs}
        disabled={isScrapingJobs}
        className="whitespace-nowrap"
      >
        {isScrapingJobs ? "Fetching..." : "Fetch New Jobs"}
      </Button>
    </div>
  );
};

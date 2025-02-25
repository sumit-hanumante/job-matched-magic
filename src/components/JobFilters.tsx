
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
    console.log('Source change clicked:', value);
    onSourceChange(value);
  };

  const handleRefreshClick = () => {
    console.log('Refresh clicked');
    onRefresh();
  };

  const handleFetchJobsClick = () => {
    console.log('Fetch jobs clicked');
    onFetchJobs();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Select 
        value={selectedSource}
        onValueChange={handleSourceChange}
      >
        <SelectTrigger className="w-[180px] bg-white z-40">
          <SelectValue placeholder="Select source">
            {selectedSource === 'all' ? 'All Sources' : selectedSource}
          </SelectValue>
        </SelectTrigger>
        <SelectContent position="popper" className="bg-white z-50">
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
          <SelectValue placeholder="Select job type">
            {selectedJobType}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white z-50">
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
        className="whitespace-nowrap bg-white"
      >
        Refresh Jobs
      </Button>

      <Button 
        onClick={handleFetchJobsClick}
        disabled={isScrapingJobs}
        className="whitespace-nowrap bg-primary text-white"
      >
        {isScrapingJobs ? "Fetching..." : "Fetch New Jobs"}
      </Button>
    </div>
  );
};

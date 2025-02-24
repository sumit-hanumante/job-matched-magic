
interface SourceCount {
  source: string;
  count: number;
}

interface JobListHeaderProps {
  jobCount: number;
  selectedSource: string;
  lastUpdated: string | null;
  activeSources: SourceCount[];
}

export const JobListHeader = ({
  jobCount,
  selectedSource,
  lastUpdated,
  activeSources
}: JobListHeaderProps) => {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">
        {jobCount} jobs found from {selectedSource === 'all' ? 'all' : selectedSource}, last updated {" "}
        {lastUpdated ? new Date(lastUpdated).toLocaleString() : "never"}
      </p>
      <p className="text-xs text-muted-foreground">
        Sources: {activeSources.map(s => `${s.source} (${s.count})`).join(', ') || 'None'}
      </p>
    </div>
  );
};

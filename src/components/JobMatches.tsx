
import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getUserJobMatches } from '@/lib/jobMatcher';
import JobCard from '@/components/JobCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export const JobMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const matchData = await getUserJobMatches(user.id);
        setMatches(matchData);
      } catch (error) {
        console.error('Error fetching job matches:', error);
        toast({
          title: 'Error',
          description: 'Failed to load job matches',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [user, toast]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Job Matches</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[320px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Your Job Matches</h2>
        <div className="p-8 text-center border rounded-xl bg-muted/20">
          <p className="text-muted-foreground">
            No job matches found. Upload your resume to get personalized job matches.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Job Matches</h2>
        <Badge variant="outline" className="px-2 py-1">
          {matches.length} matches found
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.map((match) => (
          <div key={match.id} className="relative">
            <div className="absolute -top-2 -right-2 z-10">
              <Badge className="bg-primary">
                {match.match_score}% Match
              </Badge>
            </div>
            <JobCard 
              job={{
                ...match.jobs,
                matchScore: match.match_score
              }} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default JobMatches;

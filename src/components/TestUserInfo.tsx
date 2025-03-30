
import { useState, useEffect } from 'react';
import { getLastTestUserEmail } from '@/lib/matchers/vectorMatchers';
import { toast } from './ui/use-toast';

const TestUserInfo = () => {
  const [loading, setLoading] = useState(true);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch test user email on component mount
  useEffect(() => {
    fetchTestUser();
  }, []);

  const fetchTestUser = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getLastTestUserEmail();
      
      if (result.error) {
        setError(result.error);
        toast({
          variant: "destructive",
          title: "Error finding test user",
          description: result.error,
        });
      } else if (result.email) {
        setEmailInfo(result.email);
      } else {
        setError("No test user information found");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-slate-50">
      <h3 className="text-lg font-medium mb-2">Test User Information</h3>
      
      {loading ? (
        <div className="mt-2 text-sm text-slate-600">Loading test user info...</div>
      ) : emailInfo ? (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{emailInfo}</p>
        </div>
      ) : error ? (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      ) : null}
    </div>
  );
};

export default TestUserInfo;

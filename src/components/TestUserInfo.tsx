
import { useState, useEffect } from 'react';
import { getLastTestUserEmail } from '@/lib/matchers/vectorMatchers';
import { Button } from './ui/button';
import { toast } from './ui/use-toast';

const TestUserInfo = () => {
  const [loading, setLoading] = useState(false);
  const [emailInfo, setEmailInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        toast({
          title: "Test User Info",
          description: result.email,
        });
      } else {
        setError("No test user information found");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-slate-50">
      <h3 className="text-lg font-medium mb-2">Test User Information</h3>
      <p className="text-sm text-slate-600 mb-4">
        Click the button below to find information about the test user that was created
      </p>
      
      <Button 
        onClick={fetchTestUser}
        disabled={loading}
        className="mb-3"
      >
        {loading ? 'Searching...' : 'Find Test User'}
      </Button>

      {emailInfo && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">{emailInfo}</p>
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default TestUserInfo;

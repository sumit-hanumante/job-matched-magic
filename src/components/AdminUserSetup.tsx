
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { createAdminUser } from "@/scripts/createTestUsers";

const AdminUserSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCreateAdmin = async () => {
    setIsCreating(true);
    setResult(null);
    
    try {
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      
      // Override console.log to capture logs
      console.log = (...args) => {
        originalConsoleLog(...args);
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
        ).join(' '));
      };
      
      await createAdminUser();
      
      // Restore original console.log
      console.log = originalConsoleLog;
      
      // Set the captured logs as result
      setResult(logs.join('\n'));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 max-w-2xl">
      <h3 className="text-lg font-semibold mb-3">Admin User Setup</h3>
      <p className="text-sm text-gray-600 mb-4">
        Check if admin user exists (sumit@example.com). If not, create the user with admin permissions.
      </p>
      
      <Button 
        onClick={handleCreateAdmin}
        disabled={isCreating}
        className="mb-4"
      >
        {isCreating ? 'Creating...' : 'Create Admin User'}
      </Button>
      
      {result && (
        <div className="mt-4">
          <h4 className="font-medium text-sm mb-2">Result:</h4>
          <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};

export default AdminUserSetup;

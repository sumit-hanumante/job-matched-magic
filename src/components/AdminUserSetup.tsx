
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "@/components/ui/use-toast";

const AdminUserSetup = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCreateAdmin = async () => {
    setIsCreating(true);
    setResult(null);
    
    try {
      // First check if user already exists
      const { data: existingUsers, error: searchError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', 'sumit@example.com')
        .maybeSingle();
        
      if (searchError) {
        throw new Error(`Error checking for existing user: ${searchError.message}`);
      }
      
      if (existingUsers) {
        setResult("Admin user already exists");
        toast({
          title: "User Exists",
          description: "Admin user sumit@example.com already exists.",
        });
        return;
      }
      
      // Create admin user
      const { data: adminUser, error: adminUserError } = await supabase.auth.signUp({
        email: "sumit@example.com",
        password: "123456",
        options: {
          data: {
            full_name: "Sumit Admin",
          },
        }
      });

      if (adminUserError) throw adminUserError;
      
      setResult(JSON.stringify(adminUser, null, 2));
      
      toast({
        title: "Admin User Created",
        description: "Admin user sumit@example.com was created successfully.",
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResult(`Error: ${errorMessage}`);
      toast({
        title: "Error Creating Admin User",
        description: errorMessage,
        variant: "destructive",
      });
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

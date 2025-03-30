
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";

const AdminTestUsers = () => {
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<{superUser: any, normalUser: any} | null>(null);

  const handleCreateUsers = async () => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'cleanup-and-create' },
      });

      if (error) throw error;

      console.log('Response from edge function:', data);
      
      if (data.superUser && data.normalUser) {
        setUsers({
          superUser: data.superUser,
          normalUser: data.normalUser
        });
      }
      
      toast({
        title: "Users Created",
        description: "Test users have been created successfully. Check below for details.",
      });
    } catch (error) {
      console.error("Error creating test users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create test users. See console for details.",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 border rounded-md bg-secondary/20">
      <h3 className="text-lg font-medium mb-4">Admin: Manage Test Users</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This will delete all existing users and create two test users:<br />
        1. Super User (sumit@example.com / 123)<br />
        2. Normal User (test@example.com / 123)
      </p>
      <Button 
        onClick={handleCreateUsers}
        disabled={isCreating}
      >
        {isCreating ? "Processing..." : "Cleanup & Create Test Users"}
      </Button>
      
      {users && (
        <div className="mt-4 p-3 bg-secondary/10 rounded-md">
          <h4 className="font-medium mb-2">Created Users:</h4>
          <div className="text-xs space-y-2">
            <div>
              <p><strong>Super User:</strong></p>
              <p>Email: {users.superUser.user.email}</p>
              <p>ID: {users.superUser.user.id}</p>
            </div>
            <div>
              <p><strong>Normal User:</strong></p>
              <p>Email: {users.normalUser.user.email}</p>
              <p>ID: {users.normalUser.user.id}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        Note: The users are created with email confirmation already done, so you can log in immediately.
      </p>
    </div>
  );
};

export default AdminTestUsers;

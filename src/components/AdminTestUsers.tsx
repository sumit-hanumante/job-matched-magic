
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { createTestUsers } from "@/scripts/createTestUsers";
import { toast } from "@/components/ui/use-toast";

const AdminTestUsers = () => {
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateUsers = async () => {
    setIsCreating(true);
    try {
      await createTestUsers();
      toast({
        title: "Users Created",
        description: "Test users have been created successfully. Check the console for details.",
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
      <h3 className="text-lg font-medium mb-4">Admin: Create Test Users</h3>
      <p className="text-sm text-muted-foreground mb-4">
        This will create two test users:<br />
        1. Super User (sumit@example.com / 123)<br />
        2. Normal User (test@example.com / 123)
      </p>
      <Button 
        onClick={handleCreateUsers}
        disabled={isCreating}
      >
        {isCreating ? "Creating Users..." : "Create Test Users"}
      </Button>
      <p className="text-xs text-muted-foreground mt-2">
        Note: You'll need to confirm these accounts in the Supabase dashboard or disable email confirmation.
      </p>
    </div>
  );
};

export default AdminTestUsers;


import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { User2 } from "lucide-react";

const Header = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  return (
    <header className="border-b bg-white/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-primary">Job Matcher</h1>
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="hover:bg-destructive hover:text-destructive-foreground"
            >
              Sign Out
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default Header;

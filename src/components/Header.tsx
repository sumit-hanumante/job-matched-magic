
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { User2 } from "lucide-react";

const Logo = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mr-2"
  >
    <rect width="40" height="40" rx="8" fill="#4ECCA3" fillOpacity="0.1" />
    <path
      d="M12 20C12 16.6863 14.6863 14 18 14H22C25.3137 14 28 16.6863 28 20V26H12V20Z"
      stroke="#4ECCA3"
      strokeWidth="2"
    />
    <circle cx="20" cy="20" r="3" stroke="#4ECCA3" strokeWidth="2" />
    <path
      d="M16 26V28H24V26"
      stroke="#4ECCA3"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

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
        <div className="flex items-center">
          <Logo />
          <h1 className="text-xl font-bold text-primary">Job Matcher</h1>
        </div>
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

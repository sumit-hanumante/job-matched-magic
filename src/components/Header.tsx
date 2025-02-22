
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { User2 } from "lucide-react";

const Logo = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mr-3"
  >
    <rect width="48" height="48" rx="12" fill="#4ECCA3" fillOpacity="0.1" />
    <path
      d="M14 28a8 8 0 0116 0v4H14v-4z"
      stroke="#4ECCA3"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M22 25a4 4 0 100-8 4 4 0 000 8z"
      stroke="#4ECCA3"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M34 28.4c-2.8 4.2-7.1 7-12 7-4.9 0-9.2-2.8-12-7"
      stroke="#4ECCA3"
      strokeWidth="2.5"
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
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center">
          <Logo />
          <h1 className="text-2xl font-bold text-primary">Job Matcher</h1>
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

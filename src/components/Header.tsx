
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import { User2, Search } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Auth from "./Auth";
import { Link } from "react-router-dom";

const Logo = () => (
  <div className="flex items-center gap-2">
    <Search className="w-6 h-6 text-slate-800" />
    <span className="text-xl font-bold text-slate-800">JobMatch</span>
  </div>
);

const Header = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

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
    <header className="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="hover:opacity-90 transition-opacity">
          <Logo />
        </Link>
        
        {user ? (
          <div className="flex items-center gap-4">
            <Link 
              to="/profile" 
              className="flex items-center gap-2 bg-secondary/50 px-4 py-2 rounded-full hover:bg-secondary/70 transition-colors"
            >
              <User2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">
                {user.user_metadata?.full_name || user.email?.split('@')[0]}
              </span>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Button 
            variant="default" 
            onClick={() => setShowAuthDialog(true)}
            className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
          >
            Sign In
          </Button>
        )}

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign in to continue</DialogTitle>
            </DialogHeader>
            <Auth onSuccess={() => setShowAuthDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
};

export default Header;

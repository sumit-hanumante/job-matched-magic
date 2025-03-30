
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import JobMatches from "@/components/JobMatches";

const Index = () => {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const [prefilledName, setPrefilledName] = useState("");

  const handleGetStarted = () => {
    const targetSection = document.getElementById('resume');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLoginPrompt = (email?: string, fullName?: string) => {
    if (email) setPrefilledEmail(email);
    if (fullName) setPrefilledName(fullName);
    setShowAuthDialog(true);
  };

  return (
    <div className="min-h-screen">
      <Hero onGetStarted={handleGetStarted} />
      
      <main className="container mx-auto px-4 py-16 space-y-24">
        <section id="resume" className="scroll-mt-16 max-w-2xl mx-auto animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Upload Your Resume
            </h2>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Let our AI-powered system match you with the perfect opportunities
            </p>
          </div>
          <div className="bg-gradient-to-b from-white to-secondary/20 rounded-2xl p-8 backdrop-blur-sm border border-secondary/80 shadow-xl shadow-primary/5">
            <ResumeUpload onLoginRequired={handleLoginPrompt} />
          </div>
        </section>

        {user && (
          <section id="job-matches" className="scroll-mt-16 animate-fade-in">
            <JobMatches />
          </section>
        )}

        <section id="jobs" className="scroll-mt-16 animate-fade-in">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
              Available Opportunities
            </h2>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {user ? 'Personalized job matches based on your profile' : 'Explore our curated job listings'}
            </p>
          </div>
          <JobList onLoginRequired={() => setShowAuthDialog(true)} />
        </section>

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign in to continue</DialogTitle>
            </DialogHeader>
            <Auth 
              onSuccess={() => setShowAuthDialog(false)}
              defaultEmail={prefilledEmail}
              defaultName={prefilledName}
            />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default Index;

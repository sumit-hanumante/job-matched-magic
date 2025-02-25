
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
      <Header />
      <Hero onGetStarted={handleGetStarted} />
      
      <main className="container mx-auto px-4 py-16 space-y-16">
        <section id="resume" className="scroll-mt-16 max-w-2xl mx-auto animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold mb-2">Your Resume</h2>
            <p className="text-sm text-muted-foreground">
              Upload your resume to get personalized job matches
            </p>
          </div>
          <div className="bg-gradient-to-b from-secondary/80 to-secondary/20 rounded-xl p-6 backdrop-blur-sm border border-secondary shadow-lg">
            <ResumeUpload onLoginRequired={handleLoginPrompt} />
          </div>
        </section>

        <section id="jobs" className="scroll-mt-16 animate-fade-in">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Available Jobs</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              {user ? 'Matches based on your profile' : 'Latest opportunities'}
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

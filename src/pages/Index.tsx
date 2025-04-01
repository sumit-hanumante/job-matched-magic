
import { lazy, Suspense, useState } from "react";
import Hero from "@/components/Hero";
import { useAuth } from "@/components/AuthProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Auth from "@/components/Auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

// Lazy load components
const ResumeUpload = lazy(() => import("@/components/ResumeUpload"));
const JobList = lazy(() => import("@/components/JobList"));
const JobMatches = lazy(() => import("@/components/JobMatches"));

const Index = () => {
  const { user } = useAuth();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [prefilledEmail, setPrefilledEmail] = useState("");
  const [prefilledName, setPrefilledName] = useState("");
  const isMobile = useIsMobile();

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

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-6">
      <div className="h-6 bg-slate-200 rounded-md w-1/3 mx-auto"></div>
      <div className="h-60 bg-slate-200 rounded-xl"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <Hero onGetStarted={handleGetStarted} />
      
      <main className="container mx-auto px-4 sm:px-6 py-12 sm:py-16 md:py-24 space-y-16 sm:space-y-20 md:space-y-32">
        <section 
          id="resume" 
          className="scroll-mt-16 max-w-2xl mx-auto animate-fade-in"
        >
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500">
              Upload Your Resume
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              Let our AI-powered system match you with the perfect opportunities
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-xl shadow-slate-200/30 overflow-hidden">
            <Suspense fallback={renderSkeleton()}>
              <div className="p-4 sm:p-6">
                <ResumeUpload onLoginRequired={handleLoginPrompt} />
              </div>
            </Suspense>
          </div>
        </section>

        {user && (
          <section id="job-matches" className="scroll-mt-16 animate-fade-in">
            <Suspense fallback={renderSkeleton()}>
              <JobMatches />
            </Suspense>
          </section>
        )}

        <section id="jobs" className="scroll-mt-16 animate-fade-in">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 sm:mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary-700 to-primary-500">
              Available Opportunities
            </h2>
            <p className="text-sm sm:text-lg text-slate-600 max-w-lg mx-auto">
              {user ? 'Personalized job matches based on your profile' : 'Explore our curated job listings'}
            </p>
          </div>
          
          <Suspense fallback={renderSkeleton()}>
            <JobList onLoginRequired={() => setShowAuthDialog(true)} />
          </Suspense>
        </section>

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Sign in to continue</DialogTitle>
            </DialogHeader>
            <Auth 
              onSuccess={() => {
                setShowAuthDialog(false);
                toast({
                  title: "Signed in successfully",
                  description: "You can now upload your resume and get job matches."
                });
              }}
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

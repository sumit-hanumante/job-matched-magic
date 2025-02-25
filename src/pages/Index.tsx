
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user } = useAuth();

  const handleGetStarted = () => {
    const targetSection = document.getElementById(user ? 'jobs' : 'auth');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <Hero onGetStarted={handleGetStarted} />
      
      <main className="container mx-auto px-4 py-16 space-y-16">
        {!user ? (
          <section id="auth" className="scroll-mt-16">
            <h2 className="text-2xl font-bold text-center mb-4">Get Started</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-md mx-auto">
              Sign in to see personalized job matches based on your resume
            </p>
            <Auth />
          </section>
        ) : (
          <>
            <section id="jobs" className="scroll-mt-16">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Available Jobs</h2>
                {!user && (
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Sign in to get personalized matches
                  </p>
                )}
              </div>
              <JobList />
            </section>

            <section id="resume" className="scroll-mt-16 bg-secondary/50 rounded-xl p-6 mt-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold mb-2">Resume Settings</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Update your resume to improve job matches
                </p>
              </div>
              <ResumeUpload />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;

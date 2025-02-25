
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
      
      <main className="container mx-auto px-4 py-16">
        {!user ? (
          <section id="auth" className="scroll-mt-16">
            <h2 className="text-2xl font-bold text-center mb-4">Get Started</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-md mx-auto">
              Sign in to explore opportunities tailored to your skills
            </p>
            <Auth />
          </section>
        ) : (
          <>
            <div className="grid md:grid-cols-[1fr_300px] gap-8">
              <section id="jobs" className="scroll-mt-16">
                <div className="text-center md:text-left mb-8">
                  <h2 className="text-2xl font-bold mb-2">Opportunities</h2>
                  <p className="text-muted-foreground max-w-md">
                    Positions matching your profile
                  </p>
                </div>
                <JobList />
              </section>

              <aside className="space-y-6">
                <section id="resume" className="sticky top-24 transition-all duration-300">
                  <ResumeUpload />
                </section>
              </aside>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;

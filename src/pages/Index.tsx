
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user } = useAuth();

  const handleGetStarted = () => {
    const targetSection = document.getElementById(user ? 'resume' : 'auth');
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <Hero onGetStarted={handleGetStarted} />
      
      <main className="container mx-auto px-4 py-32 space-y-32">
        {!user ? (
          <section id="auth" className="scroll-mt-32">
            <h2 className="text-3xl font-bold text-center mb-8">Get Started Today</h2>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create an account to upload your resume and get personalized job matches. 
              Our AI-powered platform will analyze your skills and experience to find the best opportunities for you.
            </p>
            <Auth />
          </section>
        ) : (
          <>
            <section id="resume" className="scroll-mt-32">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Upload Your Resume</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Let our AI analyze your resume and match you with the perfect job opportunities. 
                  We'll consider your skills, experience, and career goals to find the best matches.
                </p>
              </div>
              <ResumeUpload />
            </section>

            <section id="matches" className="scroll-mt-32">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Your Job Matches</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Based on your resume and preferences, we've found these opportunities that align with your profile. 
                  Our AI continuously updates these matches as new positions become available.
                </p>
              </div>
              <JobList />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;

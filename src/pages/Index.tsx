
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import Header from "@/components/Header";
import { useAuth } from "@/components/AuthProvider";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      
      <main className="container mx-auto px-4 py-32 space-y-32">
        {!user ? (
          <section id="auth" className="scroll-mt-32">
            <h2 className="text-3xl font-bold text-center mb-8">Get Started</h2>
            <Auth />
          </section>
        ) : (
          <>
            <section id="matches" className="scroll-mt-32">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Your Job Matches</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Based on your skills and experience, we've found these opportunities that match your profile.
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

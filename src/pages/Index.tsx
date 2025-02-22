
import Hero from "@/components/Hero";
import ResumeUpload from "@/components/ResumeUpload";
import JobList from "@/components/JobList";
import Auth from "@/components/Auth";
import { useAuth } from "@/components/AuthProvider";
import { Job } from "@/lib/types";

// Sample data for demonstration
const sampleJobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechCorp",
    location: "Remote",
    description: "We're looking for an experienced frontend developer with expertise in React and TypeScript...",
    applyUrl: "https://example.com/jobs/1",
    matchScore: 95,
    postedDate: "2024-03-15",
  },
  {
    id: "2",
    title: "Full Stack Engineer",
    company: "InnovateX",
    location: "New York, NY",
    description: "Join our team of passionate developers building next-generation web applications...",
    applyUrl: "https://example.com/jobs/2",
    matchScore: 88,
    postedDate: "2024-03-14",
  },
  {
    id: "3",
    title: "Software Architect",
    company: "CloudScale",
    location: "San Francisco, CA",
    description: "Looking for an experienced architect to lead our technical initiatives and drive innovation...",
    applyUrl: "https://example.com/jobs/3",
    matchScore: 82,
    postedDate: "2024-03-13",
  },
];

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Hero />
      
      <main className="container mx-auto px-4 py-16 space-y-16">
        {!user ? (
          <section id="auth" className="scroll-mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">Get Started</h2>
            <Auth />
          </section>
        ) : (
          <>
            <section id="upload" className="scroll-mt-16">
              <h2 className="text-3xl font-bold text-center mb-8">Upload Your Resume</h2>
              <ResumeUpload />
            </section>

            <section id="matches" className="scroll-mt-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Your Job Matches</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Based on your skills and experience, we've found these opportunities that match your profile.
                </p>
              </div>
              <JobList jobs={sampleJobs} />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default Index;

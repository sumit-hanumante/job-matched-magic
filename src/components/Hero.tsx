
import { ArrowDown } from "lucide-react";

const Hero = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
      <span className="inline-block px-3 py-1 text-sm font-medium bg-primary/10 text-primary rounded-full mb-6 animate-fade-in">
        Intelligent Job Matching
      </span>
      
      <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.2s" }}>
        Find Your Perfect Job Match
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mb-8 animate-fade-in" style={{ animationDelay: "0.4s" }}>
        Upload your resume and let our AI match you with the most relevant job opportunities. 
        Get personalized job recommendations based on your skills and experience.
      </p>
      
      <button 
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors animate-fade-in"
        style={{ animationDelay: "0.6s" }}
      >
        Get Started
        <ArrowDown className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Hero;

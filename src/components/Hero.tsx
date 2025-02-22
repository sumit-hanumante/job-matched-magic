
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSection = () => {
    const section = document.getElementById('auth') || document.getElementById('upload');
    if (section) {
      const offset = 80;
      const elementPosition = section.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center text-center px-4 relative">
      <div className="animated-shape"></div>
      <div className="animated-shape"></div>
      
      <div className="bg-white/30 backdrop-blur-sm px-6 py-2.5 rounded-2xl shadow-sm mb-12 animate-fade-in">
        <span className="text-base md:text-lg font-semibold gradient-text tracking-wide">
          Intelligent Job Matching
        </span>
      </div>
      
      <div className="space-y-6 max-w-4xl animate-fade-in" style={{ animationDelay: "0.2s" }}>
        <h1 className="text-4xl md:text-7xl font-bold tracking-tight">
          Find Your Perfect Job Match
        </h1>
        <p className="text-xl md:text-2xl font-medium text-muted-foreground">
          With AI-Powered Precision
        </p>
      </div>
      
      <p className="text-lg text-muted-foreground max-w-2xl mt-8 mb-12 animate-fade-in leading-relaxed" style={{ animationDelay: "0.4s" }}>
        Upload your resume and let our AI match you with the most relevant job opportunities. 
        Get personalized job recommendations based on your skills and experience.
      </p>
      
      <Button
        onClick={scrollToSection}
        size="lg"
        className="text-base px-8 py-6 animate-fade-in shadow-lg hover:shadow-xl transition-all duration-300"
        style={{ animationDelay: "0.6s" }}
      >
        Get Started
        <ArrowDown className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};

export default Hero;

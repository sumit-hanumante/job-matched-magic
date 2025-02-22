
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Hero = () => {
  const scrollToSection = () => {
    const section = document.getElementById('auth') || document.getElementById('upload');
    if (section) {
      const offset = 80; // Account for header height
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
      <span className="inline-block px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary rounded-full mb-8 animate-fade-in">
        Intelligent Job Matching
      </span>
      
      <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight tracking-tight animate-fade-in max-w-4xl" style={{ animationDelay: "0.2s" }}>
        Find Your Perfect Job Match <br/> With AI-Powered Precision
      </h1>
      
      <p className="text-lg text-muted-foreground max-w-2xl mb-12 animate-fade-in leading-relaxed" style={{ animationDelay: "0.4s" }}>
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

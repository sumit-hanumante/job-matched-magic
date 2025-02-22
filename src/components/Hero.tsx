
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Logo = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mb-6"
  >
    <rect width="40" height="40" rx="8" fill="#4ECCA3" fillOpacity="0.1" />
    <path
      d="M12 20C12 16.6863 14.6863 14 18 14H22C25.3137 14 28 16.6863 28 20V26H12V20Z"
      stroke="#4ECCA3"
      strokeWidth="2"
    />
    <circle cx="20" cy="20" r="3" stroke="#4ECCA3" strokeWidth="2" />
    <path
      d="M16 26V28H24V26"
      stroke="#4ECCA3"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

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
      <Logo />
      
      <div className="bg-white/30 backdrop-blur-sm px-6 py-2 rounded-2xl shadow-sm mb-8 animate-fade-in">
        <span className="text-base md:text-lg font-semibold gradient-text tracking-wide">
          Intelligent Job Matching
        </span>
      </div>
      
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

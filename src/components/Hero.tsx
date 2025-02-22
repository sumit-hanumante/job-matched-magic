
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const Logo = () => (
  <svg
    width="64"
    height="64"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="mb-8"
  >
    <rect width="48" height="48" rx="12" fill="#4ECCA3" fillOpacity="0.1" />
    <path
      d="M14 28a8 8 0 0116 0v4H14v-4z"
      stroke="#4ECCA3"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M22 25a4 4 0 100-8 4 4 0 000 8z"
      stroke="#4ECCA3"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M34 28.4c-2.8 4.2-7.1 7-12 7-4.9 0-9.2-2.8-12-7"
      stroke="#4ECCA3"
      strokeWidth="2.5"
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

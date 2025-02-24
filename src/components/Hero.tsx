
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

interface HeroProps {
  onGetStarted?: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const createDot = () => {
      if (!dotsRef.current) return;
      
      const dot = document.createElement('div');
      dot.className = 'ai-dots';
      
      // Random starting position
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      dot.style.left = `${startX}px`;
      dot.style.top = `${startY}px`;
      
      dotsRef.current.appendChild(dot);
      
      // Remove dot after animation
      setTimeout(() => {
        dot.remove();
      }, 3000);
    };

    const interval = setInterval(createDot, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="ai-grid" />
      <div ref={dotsRef} className="absolute inset-0 pointer-events-none" />
      
      <div className="bg-white/30 backdrop-blur-sm px-6 py-2.5 rounded-2xl shadow-sm mb-12 animate-fade-in">
        <span className="text-base md:text-lg font-semibold gradient-text tracking-wide">
          AI-Powered Job Matching
        </span>
      </div>
      
      <div className="space-y-6 max-w-4xl">
        <h1 className="text-4xl md:text-7xl font-bold tracking-tight">
          {["Find", "Your", "Perfect", "Job", "Match"].map((word, i) => (
            <span
              key={i}
              className="text-reveal inline-block mr-[0.2em]"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {word.split('').map((letter, j) => (
                <span
                  key={j}
                  style={{ animationDelay: `${i * 0.1 + j * 0.03}s` }}
                >
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="text-xl md:text-2xl font-medium text-muted-foreground animate-fade-in" style={{ animationDelay: "0.8s" }}>
          Powered by AI
        </p>
      </div>
      
      <p className="text-lg text-muted-foreground max-w-2xl mt-8 mb-12 animate-fade-in leading-relaxed" style={{ animationDelay: "1s" }}>
        Upload your resume and get instant matches with the most relevant job opportunities.
      </p>
      
      <Button
        onClick={onGetStarted}
        size="lg"
        className="text-base px-8 py-6 animate-fade-in shadow-lg hover:shadow-xl transition-all duration-300"
        style={{ animationDelay: "1.2s" }}
      >
        Get Started
        <ArrowDown className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );
};

export default Hero;

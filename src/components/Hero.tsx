
import { ArrowDown, Rocket, Target, Award } from "lucide-react";
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
      
      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      dot.style.left = `${startX}px`;
      dot.style.top = `${startY}px`;
      
      dotsRef.current.appendChild(dot);
      
      setTimeout(() => {
        dot.remove();
      }, 3000);
    };

    const interval = setInterval(createDot, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
      <div className="ai-grid" />
      <div ref={dotsRef} className="absolute inset-0 pointer-events-none" />
      
      <div className="space-y-6 relative z-10 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-primary to-primary/70">
          Your Career Journey Starts Here
        </h1>
        
        <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Discover opportunities that align with your skills and aspirations
        </p>

        <div className="flex flex-wrap justify-center gap-12 mb-12">
          <Feature icon={Target} title="Smart Matching" description="AI-powered job recommendations" />
          <Feature icon={Rocket} title="Quick Apply" description="Streamlined application process" />
          <Feature icon={Award} title="Top Companies" description="Access premium opportunities" />
        </div>
        
        <Button
          onClick={onGetStarted}
          size="lg"
          className="text-lg px-8 py-6 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all"
        >
          Get Started
          <ArrowDown className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="p-3 rounded-full bg-primary/10 text-primary">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-semibold text-lg">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Hero;


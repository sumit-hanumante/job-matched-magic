
import { ArrowDown, Search, Target } from "lucide-react";
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
      
      <div className="space-y-8 relative z-10 max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 text-slate-800">
          Find Your Next
          <span className="block mt-2 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">
            Perfect Role
          </span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Smart job matching across multiple platforms, all in one place
        </p>

        <div className="flex flex-wrap justify-center gap-12 mb-12">
          <Feature 
            icon={Search} 
            title="Multi-Platform Search" 
            description="Access jobs from multiple trusted sources" 
          />
          <Feature 
            icon={Target} 
            title="AI-Powered Matching" 
            description="Personalized recommendations based on your profile" 
          />
        </div>
        
        <Button
          onClick={onGetStarted}
          size="lg"
          className="text-lg px-8 py-6 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 hover:shadow-slate-300 transition-all"
        >
          Start Your Search
          <ArrowDown className="h-5 w-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

const Feature = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="p-3 rounded-full bg-slate-100 text-slate-800">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
    <p className="text-sm text-slate-600">{description}</p>
  </div>
);

export default Hero;

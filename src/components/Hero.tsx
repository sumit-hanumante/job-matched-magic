
import { ArrowDown, Search, Target, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeroProps {
  onGetStarted?: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  const dotsRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight mb-6 text-slate-800">
          Find Your Next
          <span className="block mt-2 bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">
            Perfect Role
          </span>
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-8">
          Smart job matching across multiple platforms, all in one place
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-8 sm:gap-12 mb-12">
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
          <Feature 
            icon={Upload} 
            title="Quick Resume Upload" 
            description="Easy resume submission with detailed analysis" 
          />
        </div>
        
        <Button
          onClick={onGetStarted}
          size={isMobile ? "default" : "lg"}
          className={cn(
            "bg-primary-600 hover:bg-primary-700 text-white shadow-xl shadow-primary-100/30",
            isMobile ? "text-base px-6 py-2.5" : "text-lg px-8 py-6"
          )}
        >
          Start Your Search
          <ArrowDown className={cn("ml-2", isMobile ? "h-4 w-4" : "h-5 w-5")} />
        </Button>
      </div>
    </div>
  );
};

interface FeatureProps {
  icon: React.FC<any>;
  title: string;
  description: string;
}

const Feature = ({ icon: Icon, title, description }: FeatureProps) => (
  <div className="flex flex-col items-center gap-3">
    <div className="p-3 rounded-full bg-primary-50 text-primary-600 border border-primary-100">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="font-semibold text-lg text-slate-800">{title}</h3>
    <p className="text-sm text-slate-600 max-w-[200px]">{description}</p>
  </div>
);

export default Hero;


import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Automatically redirect to dashboard after animation
    const timer = setTimeout(() => {
      navigate('/dashboard');
    }, 3000); // 3 seconds delay

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className={`min-h-screen flex items-center justify-center bg-background ${!isMobile ? 'pl-64' : 'pt-20'}`}>
      <div className="text-center animate-scale-in">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-heading mb-4">
          <span className="text-golden-whisker">Gato</span>
        </h1>
        <div className="animate-pulse">
          <div className="h-2 w-24 bg-golden-whisker/50 rounded mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

export default Index;

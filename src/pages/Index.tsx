
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <div className={`min-h-screen flex items-center justify-center bg-background ${!isMobile ? 'pl-64' : 'pt-20'}`}>
      <div className="max-w-3xl px-6 py-16 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8 tracking-tight text-heading">
          Bienvenido a <span className="text-golden-whisker">Gato</span>
        </h1>
        <p className="text-base md:text-xl text-subtitle mb-12 leading-relaxed">
          La plataforma exclusiva para gestionar servicios premium para residentes y proveedores de servicios.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/client')} 
            size="lg" 
            className="text-base px-8 py-6 bg-golden-whisker hover:bg-golden-whisker-hover text-heading"
          >
            Portal de Cliente
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            size="lg" 
            variant="outline"
            className="text-base px-8 py-6 border-golden-whisker text-heading hover:bg-golden-whisker/10"
          >
            Administración
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

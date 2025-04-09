
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-3xl px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-8 tracking-tight">
          Bienvenido a <span className="text-primary">Gato</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-12 leading-relaxed">
          La plataforma exclusiva para gestionar servicios premium para residentes y proveedores de servicios.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/client')} 
            size="lg" 
            className="text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground premium-shadow"
          >
            Portal de Cliente
          </Button>
          <Button 
            onClick={() => navigate('/dashboard')} 
            size="lg" 
            variant="outline"
            className="text-base px-8 py-6 border-primary text-primary hover:bg-primary/10 luxury-border"
          >
            Administración
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;

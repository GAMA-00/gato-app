
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // We'll leave this commented out to allow users to see the splash screen
    // navigate('/client'); 
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-luxury-white p-4">
      <h1 className="text-3xl md:text-4xl font-bold text-navy mb-8 text-center">
        Bienvenido a Gato Services
      </h1>
      
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button 
          className="flex-1 bg-navy hover:bg-navy-hover py-6" 
          size="lg"
          onClick={() => navigate('/client')}
        >
          Buscar Servicios
        </Button>
        
        <Button 
          className="flex-1 bg-slate-700 hover:bg-slate-800 py-6" 
          size="lg"
          onClick={() => navigate('/register')}
        >
          Crear Cuenta
        </Button>
      </div>
      
      <div className="mt-8 text-sm text-gray-500">
        <p>¿Ya tienes cuenta? <Link to="/login" className="text-navy hover:underline">Iniciar sesión</Link></p>
      </div>
      
      <div className="mt-16 text-xs text-gray-400 max-w-md text-center">
        <p>
          Si estás experimentando problemas al crear una cuenta, contáctanos al
          soporte técnico o prueba con las opciones avanzadas de registro.
        </p>
      </div>
    </div>
  );
};

export default Index;

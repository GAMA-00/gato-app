
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Forzar recarga completa para actualizar estilos
    const forceRefresh = () => {
      console.log("Forcing a complete refresh...");
      window.location.href = '/client';
    };
    
    // Redirecciona a la vista de categorías del cliente con un pequeño delay
    setTimeout(forceRefresh, 100);
  }, [navigate]);

  // Retornamos un mensaje de carga mientras se redirecciona
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Cargando...</p>
    </div>
  );
};

export default Index;

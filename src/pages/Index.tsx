
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Forzar recarga completa para actualizar estilos
    const forceRefresh = () => {
      console.log("Forcing a complete refresh with timestamp...");
      // Agregamos un timestamp para asegurar que no use caché
      window.location.href = `/client?t=${new Date().getTime()}`;
    };
    
    // Ejecutar inmediatamente para una recarga completa
    forceRefresh();
  }, [navigate]);

  // Retornamos un mensaje de carga mientras se redirecciona
  return (
    <div className="flex items-center justify-center h-screen">
      <p>Cargando...</p>
    </div>
  );
};

export default Index;

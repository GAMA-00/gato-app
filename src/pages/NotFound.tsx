
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: Usuario intentó acceder a una ruta inexistente:",
      location.pathname,
      "User authenticated:", isAuthenticated,
      "User role:", user?.role
    );
  }, [location.pathname, user?.role, isAuthenticated]);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else if (user?.role === 'provider') {
      navigate("/dashboard");
    } else {
      navigate("/client");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">¡Ups! Página no encontrada</p>
        <p className="text-gray-500 mb-6">
          No pudimos encontrar la página que estás buscando. La ruta{" "}
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
            {location.pathname}
          </span>{" "}
          no existe.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={handleGoBack} variant="outline">
            Regresar
          </Button>
          <Button onClick={handleGoHome}>
            {!isAuthenticated ? 'Ir al Login' : 'Ir al Inicio'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

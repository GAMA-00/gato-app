
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/client'); // Ahora redirige a nuestra nueva vista de categorías
  }, [navigate]);

  // Return null since we're immediately redirecting
  return null;
};

export default Index;


import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/client'); // Redirecciona a la vista de categorías del cliente
  }, [navigate]);

  // Retornamos null ya que estamos redireccionando inmediatamente
  return null;
};

export default Index;

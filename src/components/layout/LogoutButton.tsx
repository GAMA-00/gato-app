import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Cerrar sesión. Reemplaza el logout que vivía en el menú hamburguesa de móvil
 * (removido a favor de la barra inferior). Va en Servicio (proveedor) y Perfil (cliente).
 */
export default function LogoutButton() {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate("/", { replace: true });
    }
  };

  if (!user) return null;

  return (
    <Button
      variant="outline"
      className="h-12 w-full text-destructive hover:text-destructive"
      disabled={isLoggingOut}
      onClick={handleLogout}
    >
      <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
    </Button>
  );
}

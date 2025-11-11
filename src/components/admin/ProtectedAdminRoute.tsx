import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { logger } from '@/utils/logger';

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
}

export const ProtectedAdminRoute = ({ children }: ProtectedAdminRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  // Priorizar profile.role sobre user.role (más confiable desde BD)
  const effectiveRole = profile?.role || user?.role;

  useEffect(() => {
    // Solo redirigir si ya no está cargando y el rol definitivo no es admin
    if (!isLoading && effectiveRole && effectiveRole !== 'admin') {
      logger.debug('ProtectedAdminRoute: Non-admin user, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [effectiveRole, isLoading, navigate]);

  // Mostrar loading mientras se verifica la sesión O mientras se carga el perfil
  if (isLoading || (user && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Verificar autenticación
  if (!user) {
    return null;
  }

  // Verificar rol admin (priorizar profile)
  return effectiveRole === 'admin' ? <>{children}</> : null;
};

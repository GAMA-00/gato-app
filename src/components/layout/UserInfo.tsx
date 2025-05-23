
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogIn, LogOut, CreditCard, UserCircle } from 'lucide-react';

interface UserInfoProps {
  isClientSection: boolean;
  onSwitchView?: () => void;
}

const UserInfo = ({ isClientSection, onSwitchView }: UserInfoProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  // Debug logs para el avatar
  console.log('=== UserInfo Debug ===');
  console.log('User object:', user);
  console.log('User avatarUrl:', user?.avatarUrl);
  console.log('User avatar_url:', user?.avatar_url);
  console.log('IsAuthenticated:', isAuthenticated);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePaymentSetup = () => {
    navigate('/payment-setup');
  };
  
  const handleProfileNavigation = () => {
    navigate('/profile');
  };

  if (!isAuthenticated) {
    return (
      <div className="p-3">
        <Button 
          variant="outline" 
          size="sm"
          className="w-full justify-center bg-white text-xs"
          onClick={handleLogin}
        >
          <LogIn className="mr-1.5 h-3.5 w-3.5" />
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  // Determinar qué URL de avatar usar con logs detallados
  const avatarUrl = user?.avatarUrl || user?.avatar_url || '';
  console.log('Final avatarUrl to use:', avatarUrl);
  console.log('Avatar URL length:', avatarUrl.length);
  console.log('Avatar URL starts with http:', avatarUrl.startsWith('http'));

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={avatarUrl} 
            alt={user?.name}
            onLoad={() => console.log('Avatar image loaded successfully:', avatarUrl)}
            onError={(e) => {
              console.error('Avatar image failed to load:', avatarUrl);
              console.error('Error event:', e);
            }}
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{user?.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      
      {!user?.hasPaymentMethod && (
        <Button 
          variant="outline" 
          size="sm"
          className="w-full mb-2 justify-start text-destructive border-destructive/20 hover:bg-destructive/10 text-xs py-1.5 h-auto whitespace-normal"
          onClick={handlePaymentSetup}
        >
          <CreditCard className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          <span className="text-left leading-tight">Añadir método de pago</span>
        </Button>
      )}
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full mb-2 justify-start text-xs py-1.5 bg-white h-auto"
        onClick={handleProfileNavigation}
      >
        <UserCircle className="mr-1.5 h-3.5 w-3.5" />
        Mi Perfil
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full justify-start text-[#4D4D4D] bg-white text-xs py-1.5 h-auto"
        onClick={handleLogout}
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;

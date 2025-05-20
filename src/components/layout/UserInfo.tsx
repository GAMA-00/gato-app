
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, LogOut, CreditCard, UserCircle } from 'lucide-react';

interface UserInfoProps {
  isClientSection: boolean;
  onSwitchView?: () => void;
}

const UserInfo = ({ isClientSection, onSwitchView }: UserInfoProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-8 w-8">
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
          className="w-full mb-2 justify-start text-destructive border-destructive/20 hover:bg-destructive/10 text-xs py-1.5"
          onClick={handlePaymentSetup}
        >
          <CreditCard className="mr-1.5 h-3.5 w-3.5 shrink-0" />
          Añadir método de pago
        </Button>
      )}
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full mb-2 justify-start text-xs py-1.5 bg-white"
        onClick={handleProfileNavigation}
      >
        <UserCircle className="mr-1.5 h-3.5 w-3.5" />
        Mi Perfil
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full justify-start text-[#4D4D4D] bg-white text-xs py-1.5"
        onClick={handleLogout}
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;

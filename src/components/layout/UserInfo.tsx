
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
      <div className="p-4">
        <Button 
          variant="outline" 
          size="login"
          className="w-full justify-center bg-white"
          onClick={handleLogin}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-primary text-primary-foreground text-base">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      
      {!user?.hasPaymentMethod && (
        <Button 
          variant="outline" 
          className="w-full mb-2 justify-start text-destructive border-destructive/20 hover:bg-destructive/10 text-sm py-2"
          onClick={handlePaymentSetup}
        >
          <CreditCard className="mr-2 h-4 w-4 shrink-0" />
          Añadir método de pago
        </Button>
      )}
      
      <Button 
        variant="outline" 
        className="w-full mb-2 justify-start text-sm py-2 bg-white"
        onClick={handleProfileNavigation}
      >
        <UserCircle className="mr-2 h-4 w-4" />
        Mi Perfil
      </Button>
      
      <Button 
        variant="outline" 
        size="default" 
        className="w-full justify-start text-[#4D4D4D] bg-white text-sm py-2"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;

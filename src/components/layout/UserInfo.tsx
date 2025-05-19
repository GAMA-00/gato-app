
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
      <div className="mt-auto p-5">
        <Button 
          variant="outline" 
          size="login"
          className="w-full justify-start bg-white text-base"
          onClick={handleLogin}
        >
          <LogIn className="mr-3 h-5 w-5" />
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t p-5">
      <div className="flex items-center gap-4 mb-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary text-primary-foreground text-lg">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-base truncate">{user?.name}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      
      {!user?.hasPaymentMethod && (
        <Button 
          variant="outline" 
          className="w-full mb-3 justify-start text-destructive border-destructive/20 hover:bg-destructive/10 text-base py-3"
          onClick={handlePaymentSetup}
        >
          <CreditCard className="mr-3 h-5 w-5 shrink-0" />
          Añadir método de pago
        </Button>
      )}
      
      <Button 
        variant="outline" 
        className="w-full mb-3 justify-start text-base py-3 bg-white"
        onClick={handleProfileNavigation}
      >
        <UserCircle className="mr-3 h-5 w-5" />
        Mi Perfil
      </Button>
      
      <Button 
        variant="outline" 
        size="default" 
        className="w-full justify-start text-[#4D4D4D] bg-white text-base py-3"
        onClick={handleLogout}
      >
        <LogOut className="mr-3 h-5 w-5" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;

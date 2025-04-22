
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogIn, LogOut, CreditCard, Repeat2 } from 'lucide-react';

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

  if (!isAuthenticated) {
    return (
      <div className="mt-auto p-4">
        <Button 
          variant="outline" 
          className="w-full justify-start"
          onClick={handleLogin}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Iniciar Sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-auto border-t p-4">
      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarFallback className="bg-golden-whisker text-heading">
            {user?.name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      
      {!user?.hasPaymentMethod && (
        <Button 
          variant="outline" 
          className="w-full mb-2 justify-start text-amber-600 border-amber-200 hover:bg-amber-50 text-xs py-1.5 px-3"
          onClick={handlePaymentSetup}
        >
          <CreditCard className="mr-2 h-3.5 w-3.5 shrink-0" />
          Añadir método de pago
        </Button>
      )}
      
      <Button 
        variant="outline" 
        className="w-full mb-2 justify-start text-sm"
        onClick={onSwitchView}
      >
        <Repeat2 className="mr-2 h-4 w-4" />
        Cambiar a {isClientSection ? 'Vista de Proveedor' : 'Vista de Cliente'}
      </Button>
      
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full justify-start text-muted-foreground"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;


import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle } from 'lucide-react';

interface UserInfoProps {
  isClientSection: boolean;
  onSwitchView?: () => void;
}

const UserInfo = ({ isClientSection }: UserInfoProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('UserInfo: Logout button clicked');
    
    try {
      // Deshabilitar el botón temporalmente para evitar clics múltiples
      (e.target as HTMLButtonElement).disabled = true;
      
      await logout();
      
    } catch (error) {
      console.error('UserInfo: Error during logout:', error);
      // En caso de error, forzar redirección directa
      window.location.href = '/login';
    }
  };
  
  const handleProfileNavigation = () => {
    navigate('/profile');
  };

  if (!user) {
    return null;
  }

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={user.avatarUrl} 
            alt={user.name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {user.name?.substring(0, 2).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-xs truncate">{user.name}</p>
          <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      
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
        className="w-full justify-start text-[#4D4D4D] bg-white text-xs py-1.5 h-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        onClick={handleLogout}
        type="button"
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Cerrar Sesión
      </Button>
    </div>
  );
};

export default UserInfo;

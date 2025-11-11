
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, UserCircle } from 'lucide-react';
import { authLogger } from '@/utils/logger';

interface UserInfoProps {
  isClientSection: boolean;
  onSwitchView?: () => void;
}

const UserInfo = ({ isClientSection }: UserInfoProps) => {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOutLocal, setIsLoggingOutLocal] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isLoggingOut || isLoggingOutLocal) {
      return; // Prevent multiple logout attempts
    }
    
    authLogger.debug('Logout button clicked');
    
    try {
      setIsLoggingOutLocal(true);
      authLogger.debug('Calling logout function');
      await logout();
    } catch (error) {
      authLogger.error('Error during logout', error);
      setIsLoggingOutLocal(false);
    }
  };
  
  const handleProfileNavigation = () => {
    authLogger.debug('Navigating to profile page', { role: user?.role });
    try {
      navigate('/profile');
      authLogger.debug('Navigation to /profile successful');
    } catch (error) {
      authLogger.error('Navigation error', error);
    }
  };

  if (!user) {
    return null;
  }

  const isLoggingOutAny = isLoggingOut || isLoggingOutLocal;

  return (
    <div className="border-t p-3">
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-8 w-8">
          <AvatarImage 
            src={user.avatar_url} 
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
        disabled={isLoggingOutAny}
      >
        <UserCircle className="mr-1.5 h-3.5 w-3.5" />
        Mi Perfil
      </Button>
      
      <Button 
        variant="outline" 
        size="sm"
        className="w-full justify-start text-[#4D4D4D] bg-white text-xs py-1.5 h-auto hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleLogout}
        disabled={isLoggingOutAny}
        type="button"
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        {isLoggingOutAny ? 'Cerrando...' : 'Cerrar Sesión'}
      </Button>
    </div>
  );
};

export default UserInfo;

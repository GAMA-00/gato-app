
import React from 'react';
import { Menu, Repeat2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import UserInfo from './UserInfo';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MobileNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const MobileNav = ({ isClientSection, onSwitchView }: MobileNavProps) => {
  const { hasUnreadMessages } = useChat();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const handleLogin = () => {
    navigate('/login');
  };
  
  return (
    <div className="w-full h-16 fixed top-0 left-0 z-50 border-b bg-white py-2 px-4 flex items-center justify-between">
      <div className="flex items-center">
        <img 
          src="/lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png" 
          alt="Gato" 
          className="h-12 w-auto object-contain"
        />
      </div>
      
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              size="icon" 
              className="relative bg-white text-black border border-gray-100 rounded-lg shadow-sm"
            >
              <Menu className="h-5 w-5" />
              {hasUnreadMessages && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-2 w-2 p-0" />
              )}
              <span className="sr-only">Menú de usuario</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64 pt-6 flex flex-col">
            <div className="px-4 mb-4">
              <h1 className="text-lg font-semibold text-primary">Mi Cuenta</h1>
              <p className="text-xs text-muted-foreground">
                {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
              </p>
            </div>
            
            {!isAuthenticated && (
              <div className="p-4">
                <Button 
                  variant="outline"
                  size="sm"
                  className="w-full justify-start bg-white text-xs"
                  onClick={handleLogin}
                >
                  <LogIn className="mr-1.5 h-3.5 w-3.5" />
                  Iniciar Sesión
                </Button>
              </div>
            )}
            
            <Button 
              variant="outline"
              size="sm"
              className="mx-4 mb-4 justify-start text-xs px-3 py-1.5 h-auto bg-white border border-amber-200" 
              onClick={onSwitchView}
            >
              <Repeat2 className="mr-1.5 h-4 w-4 shrink-0" />
              <span className="text-left">
                Cambiar a {isClientSection ? 'Vista de Proveedor' : 'Vista de Cliente'}
              </span>
            </Button>
            
            <UserInfo isClientSection={isClientSection} onSwitchView={onSwitchView} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNav;


import React from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserInfo from './UserInfo';
import { NavItems } from './NavItems';
import { useBackNavigation } from '@/hooks/useBackNavigation';

interface MobileNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const MobileNav = ({ isClientSection, onSwitchView }: MobileNavProps) => {
  const { shouldShowBackButton, handleBack } = useBackNavigation();

  return (
    <div className="w-full h-12 fixed top-0 left-0 z-50 border-b bg-white px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {shouldShowBackButton && (
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className="h-8 w-8 text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
        )}
        <div className="flex items-center gap-2">
          <img 
            src="/gato-logo.png" 
            alt="Gato" 
            className="h-7 w-auto object-contain"
          />
          {!isClientSection && (
            <span className="text-sm text-muted-foreground font-medium">Proveedor</span>
          )}
        </div>
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
            
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-shrink-0">
                <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
              </div>
              <div className="mt-auto flex-shrink-0">
                <UserInfo isClientSection={isClientSection} onSwitchView={onSwitchView} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNav;

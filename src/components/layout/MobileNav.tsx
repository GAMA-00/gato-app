
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import UserInfo from './UserInfo';
import { NavItems } from './NavItems';

interface MobileNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const MobileNav = ({ isClientSection, onSwitchView }: MobileNavProps) => {
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

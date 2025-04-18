
import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import NavItems from './NavItems';
import UserInfo from './UserInfo';
import { useChat } from '@/contexts/ChatContext';

interface MobileNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const MobileNav = ({ isClientSection, onSwitchView }: MobileNavProps) => {
  const { hasUnreadMessages } = useChat();
  
  return (
    <div className="w-full h-16 fixed top-0 left-0 z-50 border-b glassmorphism py-2 px-4 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-primary">Gato</h1>
      
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Menu className="h-5 w-5" />
              {hasUnreadMessages && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-2 w-2 p-0" />
              )}
              <span className="sr-only">Alternar menú</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 pt-6">
            <div className="px-4 mb-6">
              <h1 className="text-xl font-semibold text-primary">Gato</h1>
              <p className="text-sm text-muted-foreground">
                {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
              </p>
            </div>
            
            <NavItems 
              isClientSection={isClientSection} 
              onSwitchView={onSwitchView} 
              closeMenu={() => document.querySelector('[data-state="open"]')?.setAttribute('data-state', 'closed')}
            />
            <UserInfo isClientSection={isClientSection} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default MobileNav;

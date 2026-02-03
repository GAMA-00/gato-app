
import React from 'react';
import { NavItems } from './NavItems';
import UserInfo from './UserInfo';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useBackNavigation } from '@/hooks/useBackNavigation';

interface DesktopNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const DesktopNav = ({ isClientSection, onSwitchView }: DesktopNavProps) => {
  const { shouldShowBackButton, handleBack } = useBackNavigation();

  return (
    <div className="hidden md:block">
      <div className="w-52 h-screen fixed left-0 top-0 border-r border-[#E0E0E0] bg-white py-4 flex flex-col shadow-md z-40">
        <div className="px-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {shouldShowBackButton && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 text-gray-700 hover:bg-gray-100 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Volver</span>
              </Button>
            )}
            <img 
              src="/gato-logo.png?v=4" 
              alt="Gato" 
              className="h-12 w-auto object-contain" 
            />
          </div>
          <p className="text-xs text-[#4D4D4D] font-medium">
            {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
          </p>
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 mt-3">
            <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
          </div>
          <div className="mt-auto flex-shrink-0">
            <UserInfo isClientSection={isClientSection} />
          </div>
        </div>
      </div>
      {/* Spacer div to prevent content overlap */}
      <div className="w-52" />
    </div>
  );
};

export default DesktopNav;

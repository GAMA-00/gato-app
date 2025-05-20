
import React from 'react';
import NavItems from './NavItems';
import UserInfo from './UserInfo';

interface DesktopNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const DesktopNav = ({ isClientSection, onSwitchView }: DesktopNavProps) => {
  return (
    <div className="w-56 h-screen fixed left-0 top-0 border-r border-[#E0E0E0] bg-white py-6 flex flex-col shadow-md">
      <div className="px-4 flex flex-col gap-2">
        <img 
          src="/lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png" 
          alt="Gato" 
          className="h-16 w-auto object-contain" 
        />
        <p className="text-sm text-[#4D4D4D] font-medium">
          {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
        </p>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 mt-4">
          <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
        </div>
        <div className="mt-auto flex-shrink-0">
          <UserInfo isClientSection={isClientSection} />
        </div>
      </div>
    </div>
  );
};

export default DesktopNav;

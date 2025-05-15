
import React from 'react';
import NavItems from './NavItems';
import UserInfo from './UserInfo';

interface DesktopNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const DesktopNav = ({ isClientSection, onSwitchView }: DesktopNavProps) => {
  return (
    <div className="w-72 h-screen fixed left-0 top-0 border-r border-[#E0E0E0] bg-white py-8 px-5 flex flex-col gap-8 shadow-md">
      <div className="px-4 flex flex-col gap-3">
        <img 
          src="/lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png" 
          alt="Gato" 
          className="h-24 w-auto object-contain" 
        />
        <p className="text-base text-[#4D4D4D] font-medium">
          {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
        </p>
      </div>
      
      <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
      <UserInfo isClientSection={isClientSection} />
    </div>
  );
};

export default DesktopNav;

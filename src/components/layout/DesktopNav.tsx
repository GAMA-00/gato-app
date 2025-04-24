
import React from 'react';
import NavItems from './NavItems';
import UserInfo from './UserInfo';

interface DesktopNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

const DesktopNav = ({ isClientSection, onSwitchView }: DesktopNavProps) => {
  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r glassmorphism py-8 px-4 flex flex-col gap-8">
      <div className="px-4 flex flex-col gap-2">
        <img 
          src="/lovable-uploads/2e6d167b-de93-4622-b986-70d3bd9ff753.png" 
          alt="Gato" 
          className="h-8 w-auto"
        />
        <p className="text-sm text-muted-foreground">
          {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
        </p>
      </div>
      
      <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
      <UserInfo isClientSection={isClientSection} />
    </div>
  );
};

export default DesktopNav;

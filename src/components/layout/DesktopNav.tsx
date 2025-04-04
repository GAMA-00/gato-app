
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
      <div className="px-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Gato</h1>
          <p className="text-sm text-muted-foreground">
            {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
          </p>
        </div>
        <img 
          src="/lovable-uploads/72c0b3b8-cfbd-4419-9e23-dbc8deb057f2.png" 
          alt="Gato Logo" 
          className="h-10 w-10"
        />
      </div>
      
      <NavItems isClientSection={isClientSection} onSwitchView={onSwitchView} />
      <UserInfo isClientSection={isClientSection} />
    </div>
  );
};

export default DesktopNav;

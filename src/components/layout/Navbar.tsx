
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileNav from './MobileNav';
import MobileBottomNav from './MobileBottomNav';
import DesktopNav from './DesktopNav';

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const isClientSection = location.pathname.startsWith('/client');

  const switchView = () => {
    navigate(isClientSection ? '/' : '/client');
  };

  if (isMobile) {
    return (
      <>
        <MobileNav isClientSection={isClientSection} onSwitchView={switchView} />
        <MobileBottomNav isClientSection={isClientSection} />
        <div className="h-12" /> {/* Reducir el spacer para la cabecera fija */}
        <div className="pb-[72px]" /> {/* Spacer for fixed bottom nav */}
      </>
    );
  }

  return <DesktopNav isClientSection={isClientSection} onSwitchView={switchView} />;
};

export default Navbar;

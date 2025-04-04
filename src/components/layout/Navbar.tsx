
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import MobileNav from './MobileNav';
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
    return <MobileNav isClientSection={isClientSection} onSwitchView={switchView} />;
  }

  return <DesktopNav isClientSection={isClientSection} onSwitchView={switchView} />;
};

export default Navbar;

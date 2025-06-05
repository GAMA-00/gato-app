
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import MobileNav from './MobileNav';
import MobileBottomNav from './MobileBottomNav';
import DesktopNav from './DesktopNav';

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine if we're in client section based on user role and current path
  // If user is a client, always show client perspective unless explicitly on provider routes
  // If user is a provider, show provider perspective unless explicitly on client routes
  const isClientSection = user?.role === 'client' 
    ? !location.pathname.startsWith('/dashboard') && !location.pathname.startsWith('/calendar') && !location.pathname.startsWith('/services') && !location.pathname.startsWith('/achievements')
    : location.pathname.startsWith('/client');

  const switchView = () => {
    // Navigate to the appropriate home page based on current view
    if (isClientSection) {
      navigate('/dashboard');
    } else {
      navigate('/client');
    }
  };

  if (isMobile) {
    return (
      <>
        <MobileNav isClientSection={isClientSection} onSwitchView={switchView} />
        <MobileBottomNav isClientSection={isClientSection} />
        <div className="h-8" /> {/* Reduced spacer for fixed header from h-12 to h-8 */}
        <div className="pb-[64px]" /> {/* Reduced spacer for fixed bottom nav from 72px to 64px */}
      </>
    );
  }

  return <DesktopNav isClientSection={isClientSection} onSwitchView={switchView} />;
};

export default Navbar;

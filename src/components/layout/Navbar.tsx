
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Home, Briefcase, Menu, CalendarClock, Building, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive,
  onClick
}: { 
  to: string; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  isActive: boolean;
  onClick?: () => void;
}) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
      isActive 
        ? "bg-primary/10 text-primary font-medium" 
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
    onClick={onClick}
  >
    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
    <span>{label}</span>
  </Link>
);

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  // Determine if we're in client or provider mode - only check exact path prefix
  const isClientSection = location.pathname.startsWith('/client');
  
  // Define provider navigation items - Removed "Mis Clientes" item
  const providerNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  // Define client navigation items
  const clientNavItems = [
    { to: '/client', icon: Building, label: 'Edificios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Mis Reservas' }
  ];
  
  // Select which navigation items to display based on the current section
  const navItems = isClientSection ? clientNavItems : providerNavItems;

  // Function to determine if a nav item is active
  const isNavItemActive = (itemPath: string) => {
    // Special case for root path
    if (itemPath === '/') {
      return location.pathname === '/';
    }
    
    // Special case for "/client" to ensure it's only active for client routes
    if (itemPath === '/client') {
      return location.pathname === '/client' || 
             (location.pathname.startsWith('/client/') && 
              !location.pathname.startsWith('/clients/'));
    }
    
    // For other paths, check if the current path starts with the item path
    return location.pathname.startsWith(itemPath) && 
           // Make sure we're not matching across sections
           ((isClientSection && itemPath.startsWith('/client')) || 
            (!isClientSection && !itemPath.startsWith('/client')));
  };

  // This function should ONLY be called by the dedicated "Change View" button
  const switchView = () => {
    navigate(isClientSection ? '/' : '/client');
  };

  const renderNavItems = (closeMenu?: () => void) => (
    <nav className="flex flex-col gap-2">
      {navItems.map((item) => (
        <NavItem
          key={item.to}
          to={item.to}
          icon={item.icon}
          label={item.label}
          isActive={isNavItemActive(item.to)}
          onClick={closeMenu}
        />
      ))}
      
      {/* Switch between client and provider views - ONLY way to change views */}
      <div className="mt-6 px-4">
        <Button 
          variant="outline" 
          className="w-full justify-start" 
          onClick={() => {
            if (closeMenu) closeMenu();
            switchView();
          }}
        >
          Cambiar a Vista de {isClientSection ? 'Proveedor' : 'Cliente'}
        </Button>
      </div>
    </nav>
  );

  const renderUserInfo = () => (
    <div className="mt-auto px-4">
      <div className="flex items-center gap-3 py-4">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-medium">JS</span>
        </div>
        <div>
          <p className="font-medium">{isClientSection ? 'Cliente' : 'Proveedor de Servicios'}</p>
          <p className="text-sm text-muted-foreground">{isClientSection ? 'Residente' : 'Panel de Administración'}</p>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="w-full h-16 fixed top-0 left-0 z-50 border-b glassmorphism py-2 px-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-primary">Gato</h1>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
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
            
            {renderNavItems(() => document.querySelector('[data-state="open"]')?.setAttribute('data-state', 'closed'))}
            {renderUserInfo()}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r glassmorphism py-8 px-4 flex flex-col gap-8">
      <div className="px-4">
        <h1 className="text-xl font-semibold text-primary">Gato</h1>
        <p className="text-sm text-muted-foreground">
          {isClientSection ? 'Portal de Cliente' : 'Administración de Calendario'}
        </p>
      </div>
      
      {renderNavItems()}
      {renderUserInfo()}
    </div>
  );
};

export default Navbar;

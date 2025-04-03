
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Home, Briefcase, Menu, CalendarClock, Building, Award, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive,
  onClick,
  badge
}: { 
  to: string; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  isActive: boolean;
  onClick?: () => void;
  badge?: boolean;
}) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative",
      isActive 
        ? "bg-primary/10 text-primary font-medium" 
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
    onClick={onClick}
  >
    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
    <span>{label}</span>
    {badge && (
      <Badge variant="destructive" className="absolute right-2 top-2 h-2 w-2 p-0" />
    )}
  </Link>
);

const Navbar = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { hasUnreadMessages } = useChat();
  
  const isClientSection = location.pathname.startsWith('/client');
  
  const providerNavItems = [
    { to: '/', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/messages', icon: MessageSquare, label: 'Mensajes', badge: hasUnreadMessages },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  const clientNavItems = [
    { to: '/client', icon: Building, label: 'Edificios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Mis Reservas' },
    { to: '/client/messages', icon: MessageSquare, label: 'Mensajes', badge: hasUnreadMessages }
  ];
  
  const navItems = isClientSection ? clientNavItems : providerNavItems;

  const isNavItemActive = (itemPath: string) => {
    if (itemPath === '/messages' && location.pathname === '/messages') {
      return true;
    }
    
    if (itemPath === '/client/messages' && location.pathname === '/client/messages') {
      return true;
    }
    
    if (isClientSection) {
      if (itemPath === '/client') {
        return location.pathname === '/client';
      }
      
      if (itemPath === '/client/bookings') {
        return location.pathname.startsWith('/client/bookings');
      }
      
      if (location.pathname.includes('/client/services') || 
          location.pathname.includes('/client/book')) {
        return itemPath === '/client';
      }
      
      return location.pathname === itemPath;
    }
    
    if (itemPath === '/') {
      return location.pathname === '/';
    }
    
    return location.pathname.startsWith(itemPath);
  };

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
          badge={item.badge}
        />
      ))}
      
      <div className="mt-6 px-4">
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm py-2 h-auto min-h-10 whitespace-normal" 
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
        
        <div className="flex items-center gap-3">
          <img 
            src="/lovable-uploads/72c0b3b8-cfbd-4419-9e23-dbc8deb057f2.png" 
            alt="Gato Logo" 
            className="h-8 w-8"
          />
          
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
              
              {renderNavItems(() => document.querySelector('[data-state="open"]')?.setAttribute('data-state', 'closed'))}
              {renderUserInfo()}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

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
      
      {renderNavItems()}
      {renderUserInfo()}
    </div>
  );
};

export default Navbar;

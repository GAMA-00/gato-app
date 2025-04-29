
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Home, Briefcase, CalendarClock, Award, MessageSquare, Users, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NavItem from './NavItem';
import { useChat } from '@/contexts/ChatContext';
import { useRecurringServices } from '@/hooks/useRecurringServices';

interface NavItemsProps {
  isClientSection: boolean;
  onSwitchView: () => void;
  closeMenu?: () => void;
}

// Define the NavItemType to properly type the navigation items
interface NavItemType {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: boolean;
  customBadge?: React.ReactNode;
}

const NavItems = ({ isClientSection, onSwitchView, closeMenu }: NavItemsProps) => {
  const location = useLocation();
  const { hasUnreadMessages } = useChat();
  const { count: recurringServicesCount } = useRecurringServices();
  
  // Remove "Clientes" from providerNavItems
  const providerNavItems: NavItemType[] = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/messages', icon: MessageSquare, label: 'Mensajes', badge: hasUnreadMessages },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  const clientNavItems: NavItemType[] = [
    { to: '/client', icon: Briefcase, label: 'Servicios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Mis Reservas', 
      customBadge: recurringServicesCount > 0 ? 
        <span className="flex items-center text-red-500">
          <Flame className="h-3.5 w-3.5 mr-0.5" />
          <span className="text-xs font-medium">{Math.min(recurringServicesCount, 5)}</span>
        </span> : null 
    },
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
    
    if (itemPath === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    
    return location.pathname.startsWith(itemPath);
  };

  return (
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
          customBadge={item.customBadge}
        />
      ))}
      
      <div className="mt-6 px-4">
        <Button 
          variant="outline" 
          className="w-full justify-start text-sm py-2 h-auto min-h-10 whitespace-normal" 
          onClick={() => {
            if (closeMenu) closeMenu();
            onSwitchView();
          }}
        >
          Cambiar a Vista de {isClientSection ? 'Proveedor' : 'Cliente'}
        </Button>
      </div>
    </nav>
  );
};

export default NavItems;


import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Home, Briefcase, CalendarClock, Award, MessageSquare, Users, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NavItem from './NavItem';
import { useChat } from '@/contexts/ChatContext';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';

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
  counter?: number;
}

const NavItems = ({ isClientSection, onSwitchView, closeMenu }: NavItemsProps) => {
  const location = useLocation();
  const { hasUnreadMessages } = useChat();
  const { count: recurringServicesCount } = useRecurringServices();
  const { count: pendingAppointmentsCount } = usePendingAppointments();
  
  // Remove "Clientes" from providerNavItems
  const providerNavItems: NavItemType[] = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario', counter: pendingAppointmentsCount },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/messages', icon: MessageSquare, label: 'Mensajes', badge: hasUnreadMessages },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  const clientNavItems: NavItemType[] = [
    { to: '/client', icon: Briefcase, label: 'Servicios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Mis Reservas', 
      customBadge: recurringServicesCount > 0 ? 
        <span className="flex items-center text-red-500">
          <Flame className="h-3 w-3 mr-0.5" />
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
    <nav className="flex flex-col gap-1">
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
          counter={item.counter}
        />
      ))}
      
      <div className="mt-3 px-2">
        <Button 
          variant="outline" 
          size="sm"
          className="w-full justify-start text-xs py-1.5 h-auto bg-white" 
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


import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Briefcase, CalendarClock, MessageSquare, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';

interface MobileBottomNavProps {
  isClientSection: boolean;
}

// Define NavItemType for mobile navigation
interface NavItemType {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: boolean;
  customBadge?: React.ReactNode;
  counter?: number;
}

const MobileBottomNav = ({ isClientSection }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
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
    { 
      to: '/client/bookings', 
      icon: CalendarClock, 
      label: 'Reservas', 
      badge: hasUnreadMessages,
      customBadge: recurringServicesCount > 0 ? (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          <Flame className="h-3.5 w-3.5 text-destructive" />
          <span className="absolute text-[9px] font-bold text-destructive">{Math.min(recurringServicesCount, 5)}</span>
        </div>
      ) : null
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t py-2 px-4 shadow-md">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex flex-col items-center gap-0.5 relative p-1.5"
          >
            <div className="relative">
              <item.icon 
                className={cn(
                  "h-5 w-5",
                  isNavItemActive(item.to) ? "text-primary" : "text-[#4D4D4D]"
                )} 
              />
              {item.counter !== undefined && item.counter > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-red-500 text-white rounded-full w-4 h-4 text-[10px] font-bold">
                  {item.counter > 99 ? '99+' : item.counter}
                </span>
              )}
            </div>
            <span 
              className={cn(
                "text-[10px] font-medium",
                isNavItemActive(item.to) ? "text-primary" : "text-[#4D4D4D]"
              )}
            >
              {item.label}
            </span>
            {item.badge && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-2.5 w-2.5 p-0" 
              />
            )}
            {item.customBadge}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

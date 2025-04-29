import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Briefcase, CalendarClock, MessageSquare, Award, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/contexts/ChatContext';
import { Badge } from '@/components/ui/badge';
import { useRecurringServices } from '@/hooks/useRecurringServices';

interface MobileBottomNavProps {
  isClientSection: boolean;
}

const MobileBottomNav = ({ isClientSection }: MobileBottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasUnreadMessages } = useChat();
  const { count: recurringServicesCount } = useRecurringServices();

  // Remove "Clientes" from providerNavItems
  const providerNavItems = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario' },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/messages', icon: MessageSquare, label: 'Mensajes', badge: hasUnreadMessages },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  const clientNavItems = [
    { to: '/client', icon: Briefcase, label: 'Servicios' },
    { 
      to: '/client/bookings', 
      icon: CalendarClock, 
      label: 'Reservas', 
      badge: hasUnreadMessages,
      customBadge: recurringServicesCount > 0 ? (
        <div className="absolute -top-1 -right-1 flex items-center justify-center">
          <Flame className="h-3.5 w-3.5 text-red-500" />
          <span className="absolute text-[8px] font-bold text-red-500">{Math.min(recurringServicesCount, 5)}</span>
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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t py-2 px-4">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex flex-col items-center gap-1 relative"
          >
            <item.icon 
              className={cn(
                "h-5 w-5",
                isNavItemActive(item.to) ? "text-primary" : "text-muted-foreground"
              )} 
            />
            <span 
              className={cn(
                "text-[10px]",
                isNavItemActive(item.to) ? "text-primary" : "text-muted-foreground"
              )}
            >
              {item.label}
            </span>
            {item.badge && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-2 w-2 p-0" 
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

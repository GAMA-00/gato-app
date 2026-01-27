
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calendar, Briefcase, CalendarClock, Award, User, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';
import { usePendingInvoicesCount, useClientInvoicesCount } from '@/hooks/useInvoiceCounts';
import { useClientAppointmentsCount } from '@/hooks/useClientAppointmentsCount';

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
  const { count: pendingAppointmentsCount } = usePendingAppointments();
  const { data: pendingInvoicesCount = 0 } = usePendingInvoicesCount();
  const { data: clientInvoicesCount = 0 } = useClientInvoicesCount();
  const { count: clientAppointmentsCount } = useClientAppointmentsCount();

  const providerNavItems: NavItemType[] = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario', counter: pendingAppointmentsCount },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { to: '/provider/invoices', icon: FileText, label: 'Facturas', counter: pendingInvoicesCount },
    { to: '/achievements', icon: Award, label: 'Logros' }
  ];
  
  const clientNavItems: NavItemType[] = [
    { to: '/client/categories', icon: Briefcase, label: 'Servicios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Reservas', counter: clientAppointmentsCount },
    { to: '/client/invoices', icon: FileText, label: 'Facturas', counter: clientInvoicesCount },
    { to: '/profile', icon: User, label: 'Perfil' }
  ];

  const navItems = isClientSection ? clientNavItems : providerNavItems;

  const isNavItemActive = (itemPath: string) => {
    if (isClientSection) {
      if (itemPath === '/client/categories') {
        return location.pathname === '/client/categories' || location.pathname.startsWith('/client/category');
      }
      
      if (itemPath === '/client/bookings') {
        return location.pathname.startsWith('/client/bookings');
      }
      
      if (itemPath === '/client/invoices') {
        return location.pathname === '/client/invoices';
      }
      
      if (itemPath === '/profile') {
        return location.pathname === '/profile';
      }
      
      if (location.pathname.includes('/client/services') || 
          location.pathname.includes('/client/book')) {
        return itemPath === '/client/categories';
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
                  isNavItemActive(item.to) ? "text-coral" : "text-[#4D4D4D]"
                )}
              />
              {item.counter !== undefined && item.counter > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-blue-500 text-white rounded-full w-4 h-4 text-[10px] font-bold">
                  {item.counter > 99 ? '99+' : item.counter}
                </span>
              )}
            </div>
            <span 
              className={cn(
                "text-[10px] font-medium",
                isNavItemActive(item.to) ? "text-coral" : "text-[#4D4D4D]"
              )}
            >
              {item.label}
            </span>
            {item.customBadge}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;

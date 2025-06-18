
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Calendar, Home, Briefcase, CalendarClock, Award, Flame, User } from 'lucide-react';
import NavItem from './NavItem';
import { useRecurringServices } from '@/hooks/useRecurringServices';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';
import { useProviderAchievements } from '@/hooks/useProviderAchievements';
import { useAuth } from '@/contexts/AuthContext';
import LevelBadge from '@/components/achievements/LevelBadge';

interface NavItemsProps {
  isClientSection: boolean;
  onSwitchView: () => void;
  closeMenu?: () => void;
}

interface NavItemType {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: boolean;
  customBadge?: React.ReactNode;
  counter?: number;
}

const NavItems = ({ isClientSection, closeMenu }: NavItemsProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { count: recurringServicesCount } = useRecurringServices();
  const { count: pendingAppointmentsCount } = usePendingAppointments();
  const { data: achievements } = useProviderAchievements();
  
  const providerNavItems: NavItemType[] = [
    { to: '/dashboard', icon: Home, label: 'Inicio' },
    { to: '/calendar', icon: Calendar, label: 'Calendario', counter: pendingAppointmentsCount },
    { to: '/services', icon: Briefcase, label: 'Servicios' },
    { 
      to: '/achievements', 
      icon: Award, 
      label: 'Logros',
      customBadge: achievements ? (
        <LevelBadge level={achievements.currentLevel} size="sm" showText={false} />
      ) : undefined
    },
    { to: '/profile', icon: User, label: 'Mi Perfil' }
  ];
  
  const clientNavItems: NavItemType[] = [
    { to: '/client/categories', icon: Briefcase, label: 'Servicios' },
    { to: '/client/bookings', icon: CalendarClock, label: 'Mis Reservas', 
      customBadge: (
        <span className="flex items-center text-red-500">
          <Flame className="h-3 w-3 mr-0.5" />
          <span className="text-xs font-medium">{recurringServicesCount || 0}</span>
        </span>
      )
    },
    { to: '/profile', icon: User, label: 'Mi Perfil' }
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
      
      if (itemPath === '/profile') {
        return location.pathname === '/profile';
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
    </nav>
  );
};

export default NavItems;

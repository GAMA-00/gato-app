
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NavItem from './NavItem';
import { Home, Calendar, Users, Star, Settings, Briefcase, UserPlus, Building2 } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('client' | 'provider')[];
}

export const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['client', 'provider']
  },
  {
    title: 'Servicios',
    href: '/client/categories',
    icon: Briefcase,
    roles: ['client']
  },
  {
    title: 'Mis Reservas',
    href: '/client/bookings',
    icon: Calendar,
    roles: ['client']
  },
  {
    title: 'Calendario',
    href: '/calendar',
    icon: Calendar,
    roles: ['provider']
  },
  {
    title: 'Mis Servicios',
    href: '/services',
    icon: Briefcase,
    roles: ['provider']
  },
  {
    title: 'Equipo',
    href: '/team',
    icon: Users,
    roles: ['provider']
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: UserPlus,
    roles: ['provider']
  },
  {
    title: 'Logros',
    href: '/achievements',
    icon: Star,
    roles: ['provider']
  },
  {
    title: 'Perfil',
    href: '/profile',
    icon: Settings,
    roles: ['client', 'provider']
  }
];

interface NavItemsProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

export const NavItems: React.FC<NavItemsProps> = ({ isClientSection, onSwitchView }) => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const filteredItems = navItems.filter(item => {
    if (isClientSection) {
      return item.roles.includes('client');
    } else {
      return item.roles.includes('provider');
    }
  });

  return (
    <nav className="space-y-1 px-3">
      {filteredItems.map((item) => (
        <NavItem
          key={item.href}
          to={item.href}
          label={item.title}
          icon={item.icon}
          isActive={location.pathname === item.href}
        />
      ))}
    </nav>
  );
};


import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import NavItem from './NavItem';
import { Home, Calendar, Users, Star, Settings, Briefcase } from 'lucide-react';
import { usePendingAppointments } from '@/hooks/usePendingAppointments';
import { useClientAppointmentsCount } from '@/hooks/useClientAppointmentsCount';

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
    roles: ['provider'] // Solo para proveedores
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
  // Facturas (cliente): no va en v1 (sin pagos). Removido.
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
  // Facturas (proveedor): no va en v1 (sin pagos). Removido.
  {
    title: 'Logros',
    href: '/achievements',
    icon: Star,
    roles: ['provider']
  }
];

interface NavItemsProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

export const NavItems: React.FC<NavItemsProps> = ({ isClientSection, onSwitchView }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { count: pendingAppointmentsCount } = usePendingAppointments();
  const { count: clientAppointmentsCount } = useClientAppointmentsCount();

  if (!user) return null;

  const filteredItems = navItems.filter(item => {
    if (isClientSection) {
      return item.roles.includes('client');
    } else {
      return item.roles.includes('provider');
    }
  });

  const getItemCounter = (href: string) => {
    if (href === '/calendar' && user.role === 'provider') {
      return pendingAppointmentsCount;
    }
    if (href === '/client/bookings' && user.role === 'client') {
      return clientAppointmentsCount;
    }
    return undefined;
  };

  return (
    <nav className="space-y-1 px-3">
      {filteredItems.map((item) => (
        <NavItem
          key={item.href}
          to={item.href}
          label={item.title}
          icon={item.icon}
          isActive={location.pathname === item.href}
          counter={getItemCounter(item.href)}
        />
      ))}
    </nav>
  );
};

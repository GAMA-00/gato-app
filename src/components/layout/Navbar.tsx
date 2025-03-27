
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, Home, Users, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive 
}: { 
  to: string; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  isActive: boolean; 
}) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
      isActive 
        ? "bg-primary/10 text-primary font-medium" 
        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
    )}
  >
    <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
    <span>{label}</span>
  </Link>
);

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/services', icon: Briefcase, label: 'Services' },
    { to: '/clients', icon: Users, label: 'Clients' }
  ];

  return (
    <div className="w-64 h-screen fixed left-0 top-0 border-r glassmorphism py-8 px-4 flex flex-col gap-8">
      <div className="px-4">
        <h1 className="text-xl font-semibold text-primary">ServiceSync</h1>
        <p className="text-sm text-muted-foreground">Calendar Administration</p>
      </div>
      
      <nav className="flex flex-col gap-2">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </nav>
      
      <div className="mt-auto px-4">
        <div className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-medium">JS</span>
          </div>
          <div>
            <p className="font-medium">Service Provider</p>
            <p className="text-sm text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;

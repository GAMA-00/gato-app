
import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface NavItemProps { 
  to: string; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string; 
  isActive: boolean;
  onClick?: () => void;
  badge?: boolean;
}

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive,
  onClick,
  badge
}: NavItemProps) => (
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

export default NavItem;

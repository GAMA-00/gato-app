
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
  customBadge?: React.ReactNode;
}

const NavItem = ({ to, icon: Icon, label, isActive, onClick, badge, customBadge }: NavItemProps) => {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors relative",
        isActive
          ? "bg-muted text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
      {badge && (
        <Badge 
          variant="destructive" 
          className="h-2 w-2 p-0 absolute -top-1 left-7" 
        />
      )}
      {customBadge}
    </Link>
  );
};

export default NavItem;

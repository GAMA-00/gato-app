
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
        "flex items-center gap-4 px-4 py-3 text-base font-medium rounded-lg transition-colors relative",
        isActive
          ? "bg-[#FEEBCB] text-[#1A1A1A]"
          : "text-[#4D4D4D] hover:text-[#1A1A1A] hover:bg-[#FEEBCB]/50"
      )}
      onClick={onClick}
    >
      <Icon className="h-6 w-6" />
      <span>{label}</span>
      {badge && (
        <Badge 
          variant="destructive" 
          className="h-3 w-3 p-0 absolute -top-1 left-7" 
        />
      )}
      {customBadge}
    </Link>
  );
};

export default NavItem;

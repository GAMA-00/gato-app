
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
  counter?: number;
}

const NavItem = ({ 
  to, 
  icon: Icon, 
  label, 
  isActive, 
  onClick, 
  badge, 
  customBadge,
  counter
}: NavItemProps) => {
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
      <div className="relative">
        <Icon className="h-6 w-6" />
        {counter !== undefined && counter > 0 && (
          <span className="absolute -top-2 -right-2 flex items-center justify-center bg-red-500 text-white rounded-full w-5 h-5 text-xs font-bold">
            {counter > 99 ? '99+' : counter}
          </span>
        )}
      </div>
      <span className="truncate">{label}</span>
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

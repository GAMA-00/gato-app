
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
        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors relative",
        isActive
          ? "bg-[#FEEBCB] text-[#1A1A1A]"
          : "text-[#4D4D4D] hover:text-[#1A1A1A] hover:bg-[#FEEBCB]/50"
      )}
      onClick={onClick}
    >
      <div className="relative">
        <Icon className="h-4 w-4" />
        {counter !== undefined && counter > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center bg-blue-500 text-white rounded-full w-3.5 h-3.5 text-[10px] font-bold">
            {counter > 99 ? '99+' : counter}
          </span>
        )}
      </div>
      <span className="truncate">{label}</span>
      {badge && (
        <Badge 
          variant="destructive" 
          className="h-2 w-2 p-0 absolute -top-1 left-5" 
        />
      )}
      {customBadge}
    </Link>
  );
};

export default NavItem;


import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

const BackButton = ({ onClick, className, label = "Volver" }: BackButtonProps) => {
  return (
    <Button 
      variant="outline" 
      onClick={onClick} 
      className={cn(
        "px-4 py-2 h-auto text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm rounded-lg",
        className
      )}
    >
      <ArrowLeft size={16} className="mr-2" />
      <span>{label}</span>
    </Button>
  );
};

export default BackButton;

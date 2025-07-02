
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRecurrenceInfo } from '@/utils/recurrenceUtils';

interface RecurrenceIndicatorProps {
  recurrence: string;
  isRecurringInstance?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showText?: boolean;
}

export const RecurrenceIndicator = ({ 
  recurrence, 
  isRecurringInstance = false,
  size = 'sm',
  showIcon = true,
  showText = true
}: RecurrenceIndicatorProps) => {
  const info = getRecurrenceInfo(recurrence);
  
  // Map icon names to actual components
  const iconMap = {
    'RotateCcw': RotateCcw,
    'Calendar': Calendar,
    'Clock': Clock
  };
  
  const Icon = iconMap[info.icon as keyof typeof iconMap] || Calendar;
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-2.5 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  };

  console.log('RecurrenceIndicator - Rendering with info:', info);

  return (
    <Badge 
      variant="outline"
      className={cn(
        info.color,
        sizeClasses[size],
        'font-medium inline-flex items-center gap-1'
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {showText && (
        <span>
          {info.label}
          {isRecurringInstance && size !== 'sm' && ' (Instancia)'}
        </span>
      )}
    </Badge>
  );
};

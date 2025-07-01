
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  console.log('RecurrenceIndicator - recurrence value:', recurrence, 'type:', typeof recurrence);
  
  // Return null only for explicitly non-recurring appointments
  if (!recurrence || recurrence === 'none' || recurrence === 'null' || recurrence === '') {
    console.log('RecurrenceIndicator - No recurrence, returning null');
    return null;
  }

  const getRecurrenceInfo = (freq: string) => {
    // Normalize the frequency value - handle more variations
    const normalizedFreq = freq?.toString()?.toLowerCase()?.trim();
    console.log('RecurrenceIndicator - normalized frequency:', normalizedFreq);
    
    // Handle specific recurrence types
    if (normalizedFreq.includes('week') || normalizedFreq === 'semanal') {
      return {
        label: 'Semanal',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: RotateCcw
      };
    }
    
    if (normalizedFreq.includes('biweek') || normalizedFreq === 'quincenal' || normalizedFreq.includes('2week')) {
      return {
        label: 'Quincenal',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Calendar
      };
    }
    
    if (normalizedFreq.includes('month') || normalizedFreq === 'mensual') {
      return {
        label: 'Mensual',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: Clock
      };
    }
    
    // For exact matches (fallback to exact string matching)
    switch (normalizedFreq) {
      case 'weekly':
        return {
          label: 'Semanal',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: RotateCcw
        };
      case 'biweekly':
        return {
          label: 'Quincenal',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Calendar
        };
      case 'monthly':
        return {
          label: 'Mensual',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          icon: Clock
        };
      default:
        console.log('RecurrenceIndicator - Unknown frequency, using generic:', normalizedFreq);
        // For any unknown recurring frequency, show a generic recurring indicator
        // But try to be more specific based on the raw value
        return {
          label: `Recurrente (${freq})`,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: RotateCcw
        };
    }
  };

  const info = getRecurrenceInfo(recurrence);
  const Icon = info.icon;
  
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


import React from 'react';
import { Flame } from 'lucide-react';

interface RecurringServicesIndicatorProps {
  count: number;
}

const RecurringServicesIndicator = ({ count }: RecurringServicesIndicatorProps) => {
  // Limit the counter to 5
  const normalizedCount = Math.min(count, 5);
  
  // Calculate color intensity based on the counter
  const getFlameColor = (count: number) => {
    const colors = [
      'text-blue-300',
      'text-blue-400',
      'text-blue-500',
      'text-blue-600',
      'text-blue-700'
    ];
    return colors[count - 1] || colors[0];
  };

  return normalizedCount > 0 ? (
    <div className="flex items-center gap-1">
      <Flame className={`h-5 w-5 ${getFlameColor(normalizedCount)}`} />
      <span className="text-sm font-medium">{normalizedCount}</span>
    </div>
  ) : null;
};

export default RecurringServicesIndicator;

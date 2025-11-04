import React from 'react';
import { Star } from 'lucide-react';
import LevelBadge from '@/components/achievements/LevelBadge';
import { AchievementLevel } from '@/lib/achievementTypes';

interface ServiceMetricsGridProps {
  rating: number;
  providerLevel: AchievementLevel;
}

const ServiceMetricsGrid = ({ 
  rating,
  providerLevel
}: ServiceMetricsGridProps) => {
  return (
    <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-background border-b border-stone-200">
      {/* Rating */}
      <div className="flex flex-col items-center gap-0.5">
        <Star className="h-4 w-4 text-primary fill-primary" />
        <span className="text-base font-semibold">{rating.toFixed(1)}</span>
      </div>
      
      {/* Nivel de Experiencia Real */}
      <div className="flex flex-col items-center gap-0.5">
        <LevelBadge level={providerLevel} size="sm" showText={true} />
      </div>
    </div>
  );
};

export default ServiceMetricsGrid;

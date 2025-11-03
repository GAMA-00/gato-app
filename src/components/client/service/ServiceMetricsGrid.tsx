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
    <div className="grid grid-cols-2 gap-6 px-4 py-3 border-b border-stone-200">
      {/* Rating */}
      <div className="flex flex-col items-center gap-1">
        <Star className="h-5 w-5 text-primary fill-primary" />
        <span className="text-lg font-semibold">{rating.toFixed(1)}</span>
      </div>
      
      {/* Nivel de Experiencia Real */}
      <div className="flex flex-col items-center gap-1">
        <LevelBadge level={providerLevel} size="md" showText={true} />
      </div>
    </div>
  );
};

export default ServiceMetricsGrid;

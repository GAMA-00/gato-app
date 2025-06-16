
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Award, Crown } from 'lucide-react';
import { AchievementLevel, ACHIEVEMENT_LEVELS } from '@/lib/achievementTypes';

// Custom Gem icon component since it's not in lucide-react
const GemIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3h12l4 6-10 13L2 9l4-6z" />
    <path d="M11 3 8 9l4 13 4-13-3-6" />
    <path d="M2 9h20" />
  </svg>
);

const iconMap = {
  'award': Award,
  'star': Star,
  'trophy': Trophy,
  'crown': Crown,
  'gem': GemIcon
};

interface LevelBadgeProps {
  level: AchievementLevel;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

const LevelBadge = ({ level, size = 'md', showText = true }: LevelBadgeProps) => {
  const levelInfo = ACHIEVEMENT_LEVELS.find(l => l.level === level);
  
  if (!levelInfo) return null;

  const IconComponent = iconMap[levelInfo.icon as keyof typeof iconMap] || Award;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1 min-h-6',
    md: 'text-sm px-3 py-1.5 min-h-7', 
    lg: 'text-base px-4 py-2 min-h-8'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      className={`flex items-center justify-center gap-1.5 ${sizeClasses[size]} font-semibold border whitespace-nowrap inline-flex`}
      style={{ 
        backgroundColor: levelInfo.color,
        color: 'white',
        borderColor: levelInfo.color
      }}
    >
      <IconComponent className={iconSizes[size]} />
      {showText && <span className="leading-none">{levelInfo.name}</span>}
    </Badge>
  );
};

export default LevelBadge;

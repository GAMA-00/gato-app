
import React from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AchievementLevelInfo } from '@/lib/achievementTypes';

// Map of icons for different achievement levels
import { User, Shield, Star, Award, Crown } from 'lucide-react';

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

const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="h-4 w-4" />,
  'shield': <Shield className="h-4 w-4" />,
  'star': <Star className="h-4 w-4" />,
  'award': <Award className="h-4 w-4" />,
  'trophy': <Trophy className="h-4 w-4" />,
  'crown': <Crown className="h-4 w-4" />,
  'gem': <GemIcon className="h-4 w-4" />,
};

const LevelCard: React.FC<{ 
  level: AchievementLevelInfo, 
  isCurrentLevel: boolean,
  isAchieved: boolean,
  progress: number,
  completedJobs?: number
}> = ({ level, isCurrentLevel, isAchieved, progress, completedJobs = 0 }) => {
  return (
    <Card className={`transition-all duration-300 h-full ${
      isCurrentLevel ? 'border-primary shadow-md glassmorphism border-2' : 
      isAchieved ? 'glassmorphism' : 'opacity-60'}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold leading-tight pr-3 break-words">
            {level.name}
          </CardTitle>
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
            style={{ backgroundColor: `${level.color}20` }}
          >
            {iconMap[level.icon] || <Trophy className="h-4 w-4" style={{ color: level.color }} />}
          </div>
        </div>
        <CardDescription className="line-clamp-4 min-h-[6rem]">{level.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-3 space-y-2">
          {/* Current progress display */}
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              {isCurrentLevel 
                ? `${completedJobs} / ${level.maxJobs === Infinity ? `${level.minJobs}+` : level.maxJobs} trabajos`
                : isAchieved 
                  ? "Completado"
                  : `${level.minJobs} - ${level.maxJobs === Infinity ? `${level.minJobs}+` : level.maxJobs} trabajos`
              }
            </span>
            <span className="text-primary">
              {isAchieved && !isCurrentLevel ? '100%' : isCurrentLevel ? `${Math.round(progress)}%` : '0%'}
            </span>
          </div>
          
          <Progress 
            value={isAchieved && !isCurrentLevel ? 100 : isCurrentLevel ? progress : 0} 
            className="h-3 bg-muted/30" 
          />
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Mínimo: {level.minJobs}</span>
            {level.maxJobs !== Infinity && <span>Máximo: {level.maxJobs}</span>}
          </div>
        </div>
        
        {isCurrentLevel && (
          <Badge className="mt-3" style={{ backgroundColor: level.color }}>Nivel Actual</Badge>
        )}
        {isAchieved && !isCurrentLevel && (
          <Badge variant="outline" className="mt-3 border-green-500 text-green-500">Completado</Badge>
        )}
      </CardContent>
    </Card>
  );
};

export default LevelCard;

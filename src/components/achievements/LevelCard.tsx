
import React from 'react';
import { Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AchievementLevelInfo } from '@/lib/types';

// Map of icons for different achievement levels
import { User, Shield, Star, Award } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'award': <Award className="h-5 w-5" />,
};

const LevelCard: React.FC<{ 
  level: AchievementLevelInfo, 
  isCurrentLevel: boolean,
  isAchieved: boolean,
  progress: number
}> = ({ level, isCurrentLevel, isAchieved, progress }) => {
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
            className="p-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: `${level.color}20` }}
          >
            {iconMap[level.icon] || <Trophy className="h-5 w-5" style={{ color: level.color }} />}
          </div>
        </div>
        <CardDescription className="line-clamp-4 min-h-[6rem]">{level.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-2">
          <Progress 
            value={isAchieved ? 100 : isCurrentLevel ? progress : 0} 
            className="h-2" 
            style={{ 
              background: isAchieved ? level.color : undefined,
              opacity: isAchieved ? 0.3 : 1
            }}
          />
          
          <div className="flex items-center justify-between text-xs mt-1">
            <span>{level.minPoints} pts</span>
            {level.maxPoints !== Infinity && <span>{level.maxPoints} pts</span>}
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

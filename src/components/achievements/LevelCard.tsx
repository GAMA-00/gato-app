import React from 'react';
import { Trophy, User, Shield, Star, Award, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AchievementLevelInfo } from '@/lib/achievementTypes';
import SemiCircularProgress from './SemiCircularProgress';

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
  'user': <User className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'award': <Award className="h-5 w-5" />,
  'trophy': <Trophy className="h-5 w-5" />,
  'crown': <Crown className="h-5 w-5" />,
  'gem': <GemIcon className="h-5 w-5" />,
};

interface LevelCardProps {
  level: AchievementLevelInfo;
  isCurrentLevel: boolean;
  isAchieved: boolean;
  progress: number;
  completedJobs?: number;
}

// Current Level Card - Large with gauge
const CurrentLevelCard: React.FC<LevelCardProps> = ({ 
  level, 
  progress, 
  completedJobs = 0 
}) => {
  const maxJobsForDisplay = level.maxJobs === Infinity ? level.minJobs + 100 : level.maxJobs;
  
  return (
    <Card className="glassmorphism border-2 border-primary shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center" 
              style={{ backgroundColor: `${level.color}20`, color: level.color }}
            >
              {iconMap[level.icon] || <Trophy className="h-5 w-5" />}
            </div>
            <CardTitle className="text-lg font-semibold">
              {level.name}
            </CardTitle>
          </div>
          <Badge style={{ backgroundColor: level.color }} className="text-white">
            Nivel Actual
          </Badge>
        </div>
        <CardDescription className="mt-2">
          {level.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pt-4 pb-6">
        <SemiCircularProgress
          value={progress}
          color={level.color}
          size={160}
          completedJobs={completedJobs}
          maxJobs={maxJobsForDisplay}
        />
      </CardContent>
    </Card>
  );
};

// Compact Level Card - Simple row
const CompactLevelCard: React.FC<LevelCardProps> = ({ level, isAchieved }) => {
  const jobRange = level.maxJobs === Infinity 
    ? `${level.minJobs}+ trabajos` 
    : `${level.minJobs} - ${level.maxJobs} trabajos`;

  return (
    <Card className={`transition-all duration-200 ${isAchieved ? 'glassmorphism' : 'opacity-60 bg-muted/30'}`}>
      <CardContent className="flex items-center justify-between py-4 px-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" 
            style={{ 
              backgroundColor: isAchieved ? `${level.color}20` : '#E5E7EB',
              color: isAchieved ? level.color : '#9CA3AF'
            }}
          >
            {iconMap[level.icon] || <Trophy className="h-4 w-4" />}
          </div>
          <span className={`font-medium ${isAchieved ? 'text-foreground' : 'text-muted-foreground'}`}>
            {level.name}
          </span>
          {isAchieved && (
            <Badge variant="outline" className="border-green-500 text-green-600 text-xs ml-2">
              ✓
            </Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {jobRange}
        </span>
      </CardContent>
    </Card>
  );
};

const LevelCard: React.FC<LevelCardProps> = (props) => {
  if (props.isCurrentLevel) {
    return <CurrentLevelCard {...props} />;
  }
  return <CompactLevelCard {...props} />;
};

export default LevelCard;

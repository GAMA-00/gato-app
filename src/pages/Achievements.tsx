
import React from 'react';
import { Award, Star, CheckCircle, Share2, Shield, Trophy, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import PageContainer from '@/components/layout/PageContainer';
import { ACHIEVEMENT_LEVELS, getProviderAchievements } from '@/lib/data';
import { Achievement, AchievementLevelInfo } from '@/lib/types';

const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'award': <Award className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  'share': <Share2 className="h-5 w-5" />,
  'milestone': <Trophy className="h-5 w-5" />,
  'calendar-check': <CheckCircle className="h-5 w-5" />,
  'repeat': <CheckCircle className="h-5 w-5" />,
  'zap': <CheckCircle className="h-5 w-5" />,
  'users': <CheckCircle className="h-5 w-5" />,
};

const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const isCompleted = Boolean(achievement.completedAt);
  
  return (
    <Card className={`border transition-all duration-300 hover:shadow-md ${isCompleted ? 'glassmorphism' : 'opacity-60'}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-full ${isCompleted ? 'bg-primary/10' : 'bg-muted'}`}>
            {iconMap[achievement.icon] || <Trophy className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{achievement.name}</h3>
              <Badge variant={isCompleted ? "default" : "outline"}>
                {achievement.points} pts
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
            {isCompleted && (
              <p className="text-xs text-primary mt-2">
                Completado el {achievement.completedAt?.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const LevelCard: React.FC<{ 
  level: AchievementLevelInfo, 
  isCurrentLevel: boolean,
  isAchieved: boolean 
}> = ({ level, isCurrentLevel, isAchieved }) => {
  return (
    <Card className={`transition-all duration-300 ${isCurrentLevel ? 'border-primary shadow-md glassmorphism border-2' : isAchieved ? 'glassmorphism' : 'opacity-60'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{level.name}</CardTitle>
          <div 
            className="p-2 rounded-full" 
            style={{ backgroundColor: `${level.color}20` }}
          >
            {iconMap[level.icon] || <Trophy className="h-5 w-5" style={{ color: level.color }} />}
          </div>
        </div>
        <CardDescription>{level.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <span>{level.minPoints} puntos</span>
          {level.maxPoints !== Infinity && <span>{level.maxPoints} puntos</span>}
        </div>
        {isCurrentLevel && (
          <Badge className="mt-2" style={{ backgroundColor: level.color }}>Nivel Actual</Badge>
        )}
      </CardContent>
    </Card>
  );
};

const Achievements: React.FC = () => {
  const { totalPoints, currentLevel, nextLevel, pointsToNextLevel, achievements } = getProviderAchievements();
  
  // Find current level information
  const currentLevelInfo = ACHIEVEMENT_LEVELS.find(l => l.level === currentLevel) || ACHIEVEMENT_LEVELS[0];
  const nextLevelInfo = nextLevel ? ACHIEVEMENT_LEVELS.find(l => l.level === nextLevel) : null;
  
  // Calculate progress percentage to next level
  const progressPercentage = nextLevelInfo
    ? ((totalPoints - currentLevelInfo.minPoints) / (nextLevelInfo.minPoints - currentLevelInfo.minPoints)) * 100
    : 100;
  
  // Get completed and pending achievements
  const completedAchievements = achievements.filter(a => a.completedAt);
  const pendingAchievements = achievements.filter(a => !a.completedAt);
  
  return (
    <PageContainer title="Logros" subtitle="Sigue tu progreso y desbloquea recompensas">
      <div className="space-y-8">
        {/* Progress summary card */}
        <Card className="glassmorphism">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Nivel: {currentLevelInfo.name}</h2>
                <p className="text-muted-foreground mt-1">
                  {totalPoints} puntos en total • {completedAchievements.length} logros desbloqueados
                </p>
              </div>
              {nextLevel && (
                <div className="bg-secondary/50 px-4 py-2 rounded-lg">
                  <p className="text-sm font-medium">Siguiente nivel: {nextLevelInfo?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pointsToNextLevel} puntos necesarios
                  </p>
                </div>
              )}
            </div>
            
            {nextLevel && (
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>{currentLevelInfo.name}</span>
                  <span>{nextLevelInfo?.name}</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{currentLevelInfo.minPoints} pts</span>
                  <span>{nextLevelInfo?.minPoints} pts</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Achievement levels */}
        <div>
          <h3 className="text-lg font-medium mb-4">Niveles de Logros</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACHIEVEMENT_LEVELS.map((level) => (
              <LevelCard 
                key={level.level} 
                level={level} 
                isCurrentLevel={level.level === currentLevel}
                isAchieved={totalPoints >= level.minPoints}
              />
            ))}
          </div>
        </div>
        
        {/* Completed achievements */}
        <div>
          <h3 className="text-lg font-medium mb-4">Logros Desbloqueados</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </div>
        
        {/* Pending achievements */}
        {pendingAchievements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Próximos Logros</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default Achievements;

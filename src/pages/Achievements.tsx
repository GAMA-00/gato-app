
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import { ACHIEVEMENT_LEVELS, getProviderAchievements } from '@/lib/data';
import AchievementCard from '@/components/achievements/AchievementCard';
import LevelCard from '@/components/achievements/LevelCard';

const Achievements: React.FC = () => {
  const { totalPoints, currentLevel, nextLevel, pointsToNextLevel, achievements } = getProviderAchievements();
  
  const currentLevelInfo = ACHIEVEMENT_LEVELS.find(l => l.level === currentLevel) || ACHIEVEMENT_LEVELS[0];
  const nextLevelInfo = nextLevel ? ACHIEVEMENT_LEVELS.find(l => l.level === nextLevel) : null;
  
  const progressPercentage = nextLevelInfo
    ? ((totalPoints - currentLevelInfo.minPoints) / (nextLevelInfo.minPoints - currentLevelInfo.minPoints)) * 100
    : 100;
  
  const enhancedAchievements = achievements.map(achievement => ({
    ...achievement,
    completionCount: achievement.completedAt 
      ? Math.floor(Math.random() * 5) + 1
      : 0
  }));
  
  const activeAchievements = enhancedAchievements.filter(a => a.completionCount > 0);
  const lockedAchievements = enhancedAchievements.filter(a => a.completionCount === 0);
  
  return (
    <PageContainer title="Logros" subtitle="Sube de nivel y desbloquea recompensas">
      <div className="space-y-8">
        <Card className="glassmorphism border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full flex items-center justify-center" 
                      style={{ background: `${currentLevelInfo.color}20`, color: currentLevelInfo.color }}>
                    <Trophy className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Nivel {currentLevelInfo.level.toUpperCase()}</h2>
                    <p className="text-sm text-muted-foreground">{currentLevelInfo.name}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary/50 px-4 py-2 rounded-lg w-full md:w-auto">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{totalPoints} XP</span>
                  {nextLevel && <span className="text-xs text-muted-foreground ml-2">Siguiente: {nextLevelInfo?.minPoints} XP</span>}
                </div>
                {nextLevel && (
                  <div className="mt-2">
                    <Progress value={progressPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {pointsToNextLevel} XP para el siguiente nivel
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Progresión de Nivel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACHIEVEMENT_LEVELS.map((level) => {
              const isCurrentLevelItem = level.level === currentLevel;
              const isAchieved = totalPoints >= level.minPoints;
              const levelProgress = isCurrentLevelItem 
                ? ((totalPoints - level.minPoints) / (level.maxPoints - level.minPoints)) * 100
                : 0;
              
              return (
                <LevelCard 
                  key={level.level} 
                  level={level} 
                  isCurrentLevel={isCurrentLevelItem}
                  isAchieved={isAchieved}
                  progress={levelProgress}
                />
              );
            })}
          </div>
        </div>
        
        {activeAchievements.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Logros Activos</h3>
              <Badge variant="outline" className="ml-auto">
                {activeAchievements.length} / {achievements.length}
              </Badge>
            </div>
            <div className="space-y-4">
              {activeAchievements.map((achievement) => (
                <AchievementCard key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>
        )}
        
        {lockedAchievements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Logros por Descubrir</h3>
              <Badge variant="outline" className="ml-auto">
                {lockedAchievements.length} disponibles
              </Badge>
            </div>
            <div className="space-y-4">
              {lockedAchievements.map((achievement) => (
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


import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderAchievements } from '@/hooks/useProviderAchievements';
import LevelCard from '@/components/achievements/LevelCard';
import RatingHistory from '@/components/achievements/RatingHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ACHIEVEMENT_LEVELS, AchievementLevelInfo } from '@/lib/achievementTypes';
import Navbar from '@/components/layout/Navbar';

const Achievements = () => {
  const { user } = useAuth();
  const { data: achievements, isLoading } = useProviderAchievements();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Logros" subtitle="Cargando tus logros...">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-lg" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  if (!achievements) {
    return (
      <>
        <Navbar />
        <PageContainer title="Logros" subtitle="Tus logros y reconocimientos">
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No se pudieron cargar tus logros en este momento.
            </p>
          </Card>
        </PageContainer>
      </>
    );
  }

  // Find current level based on completed jobs
  const currentLevelIndex = ACHIEVEMENT_LEVELS.findIndex(level => 
    achievements.totalCompletedJobs >= level.minJobs && 
    (ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.indexOf(level) + 1] === undefined || 
     achievements.totalCompletedJobs < ACHIEVEMENT_LEVELS[ACHIEVEMENT_LEVELS.indexOf(level) + 1].minJobs)
  );
  
  const currentLevel = currentLevelIndex >= 0 ? ACHIEVEMENT_LEVELS[currentLevelIndex] : ACHIEVEMENT_LEVELS[0];
  const nextLevel = currentLevelIndex < ACHIEVEMENT_LEVELS.length - 1 ? ACHIEVEMENT_LEVELS[currentLevelIndex + 1] : null;
  const progressPercentage = nextLevel 
    ? ((achievements.totalCompletedJobs - currentLevel.minJobs) / (nextLevel.minJobs - currentLevel.minJobs)) * 100
    : 100;

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Logros" 
        subtitle="Tus logros y reconocimientos"
        className="pt-0"
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ACHIEVEMENT_LEVELS.map((level: AchievementLevelInfo) => {
              const isCurrentLevel = level.level === currentLevel.level;
              const isAchieved = achievements.totalCompletedJobs >= level.minJobs;
              const progress = isCurrentLevel ? progressPercentage : 0;
              
              return (
                <LevelCard
                  key={level.level}
                  level={level}
                  isCurrentLevel={isCurrentLevel}
                  isAchieved={isAchieved}
                  progress={progress}
                />
              );
            })}
          </div>
          
          <RatingHistory ratingHistory={achievements.ratingHistory} />
        </div>
      </PageContainer>
    </>
  );
};

export default Achievements;

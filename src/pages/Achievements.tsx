
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderAchievements } from '@/hooks/useProviderAchievements';
import { useAppointmentCompletion } from '@/hooks/useAppointmentCompletion';
import LevelCard from '@/components/achievements/LevelCard';
import RatingHistory from '@/components/achievements/RatingHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ACHIEVEMENT_LEVELS } from '@/lib/achievementTypes';
import Navbar from '@/components/layout/Navbar';
import { useIsMobile } from '@/hooks/use-mobile';

const Achievements = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Disabled to prevent active bookings from disappearing
  // useAppointmentCompletion();
  
  const { data: achievements, isLoading } = useProviderAchievements();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#FAFAFA]">
          <div className="md:ml-52 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className={`font-bold tracking-tight text-app-text ${
                isMobile ? "text-xl mb-3" : "text-2xl md:text-3xl mb-6"
              }`}>
                Logros
              </h1>
              <p className={`text-muted-foreground ${
                isMobile ? "text-sm mb-6" : "text-base mb-8"
              }`}>
                Cargando tus logros...
              </p>
              
              <div className="space-y-6">
                <Skeleton className="h-32 w-full rounded-lg" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!achievements) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#FAFAFA]">
          <div className="md:ml-52 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <h1 className={`font-bold tracking-tight text-app-text ${
                isMobile ? "text-xl mb-3" : "text-2xl md:text-3xl mb-6"
              }`}>
                Logros
              </h1>
              <p className={`text-muted-foreground ${
                isMobile ? "text-sm mb-6" : "text-base mb-8"
              }`}>
                Tus logros y reconocimientos
              </p>
              
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  No se pudieron cargar tus logros en este momento.
                </p>
              </Card>
            </div>
          </div>
        </div>
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

  // Separate current level from others
  const currentLevelData = ACHIEVEMENT_LEVELS.find(level => level.level === currentLevel.level);
  const otherLevels = ACHIEVEMENT_LEVELS.filter(level => level.level !== currentLevel.level);

  // Calculate progress for current level
  const calculateProgress = (level: typeof currentLevel) => {
    const levelRange = level.maxJobs === Infinity ? level.minJobs + 100 : level.maxJobs - level.minJobs;
    const jobsInLevel = Math.min(achievements.totalCompletedJobs, level.maxJobs === Infinity ? achievements.totalCompletedJobs : level.maxJobs) - level.minJobs;
    return Math.max(0, (jobsInLevel / levelRange) * 100);
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#FAFAFA]">
        <div className="md:ml-52 p-4 md:p-6 pt-20 md:pt-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-app-text mb-4 md:mb-6">
              Logros
            </h1>
              
            <div className="space-y-4">
              {/* Current Level Card - Prominent with gauge */}
              {currentLevelData && (
                <LevelCard
                  level={currentLevelData}
                  isCurrentLevel={true}
                  isAchieved={true}
                  progress={calculateProgress(currentLevelData)}
                  completedJobs={achievements.totalCompletedJobs}
                />
              )}

              {/* Other Levels - Compact list */}
              <div className="space-y-2">
                {otherLevels.map((level) => {
                  const isAchieved = achievements.totalCompletedJobs >= level.minJobs;
                  
                  return (
                    <LevelCard
                      key={level.level}
                      level={level}
                      isCurrentLevel={false}
                      isAchieved={isAchieved}
                      progress={0}
                      completedJobs={achievements.totalCompletedJobs}
                    />
                  );
                })}
              </div>
              
              <RatingHistory ratingHistory={achievements.ratingHistory} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Achievements;

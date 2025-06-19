
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useProviderAchievements } from '@/hooks/useProviderAchievements';
import LevelCard from '@/components/achievements/LevelCard';
import RatingHistory from '@/components/achievements/RatingHistory';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { getProviderLevelByJobs } from '@/lib/achievementTypes';
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

  const currentLevelInfo = getProviderLevelByJobs(achievements.totalCompletedJobs);

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Logros" 
        subtitle="Tus logros y reconocimientos"
        className="pt-0"
      >
        <div className="space-y-8">
          <LevelCard 
            level={currentLevelInfo}
            progress={achievements.jobsToNextLevel}
            totalAppointments={achievements.totalCompletedJobs}
            averageRating={achievements.averageRating}
            recurringClients={0}
          />
          
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Sistema de logros en desarrollo
            </p>
          </div>
          
          <RatingHistory ratingHistory={achievements.ratingHistory} />
        </div>
      </PageContainer>
    </>
  );
};

export default Achievements;

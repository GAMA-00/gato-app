
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Star } from 'lucide-react';
import PageContainer from '@/components/layout/PageContainer';
import LevelBadge from '@/components/achievements/LevelBadge';
import RatingHistoryComponent from '@/components/achievements/RatingHistory';
import { useProviderAchievements } from '@/hooks/useProviderAchievements';
import { ACHIEVEMENT_LEVELS } from '@/lib/achievementTypes';

const Achievements: React.FC = () => {
  const { data: achievements, isLoading, error } = useProviderAchievements();

  if (error) {
    return (
      <PageContainer title="Logros" subtitle="Sube de nivel y desbloquea recompensas">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Error al cargar los logros</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading || !achievements) {
    return (
      <PageContainer title="Logros" subtitle="Sube de nivel y desbloquea recompensas">
        <div className="space-y-8 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </PageContainer>
    );
  }

  const currentLevelInfo = ACHIEVEMENT_LEVELS.find(l => l.level === achievements.currentLevel);
  const nextLevelInfo = achievements.nextLevel ? ACHIEVEMENT_LEVELS.find(l => l.level === achievements.nextLevel) : null;
  
  const progressPercentage = nextLevelInfo
    ? ((achievements.totalCompletedJobs - currentLevelInfo!.minJobs) / (nextLevelInfo.minJobs - currentLevelInfo!.minJobs)) * 100
    : 100;

  return (
    <PageContainer title="Logros" subtitle="Tu progreso basado en trabajos completados">
      <div className="space-y-8">
        {/* Progreso Principal */}
        <Card className="glassmorphism border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div 
                  className="h-16 w-16 rounded-full flex items-center justify-center" 
                  style={{ 
                    background: `${currentLevelInfo?.color}20`, 
                    color: currentLevelInfo?.color 
                  }}
                >
                  <Trophy className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">Nivel {currentLevelInfo?.name}</h2>
                    <LevelBadge level={achievements.currentLevel} size="md" />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{achievements.totalCompletedJobs} trabajos completados</span>
                    </div>
                    {achievements.averageRating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        <span>{achievements.averageRating} promedio</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-secondary/50 px-4 py-3 rounded-lg w-full md:w-auto md:min-w-[300px]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{achievements.totalCompletedJobs} trabajos</span>
                  {nextLevelInfo && (
                    <span className="text-xs text-muted-foreground">
                      Siguiente: {nextLevelInfo.minJobs} trabajos
                    </span>
                  )}
                </div>
                {nextLevelInfo ? (
                  <>
                    <Progress value={progressPercentage} className="h-3 mb-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {achievements.jobsToNextLevel} trabajos para {nextLevelInfo.name}
                    </p>
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm font-medium text-primary">¡Nivel máximo alcanzado!</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progresión de Niveles */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Progresión de Niveles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {ACHIEVEMENT_LEVELS.map((level) => {
              const isCurrentLevel = level.level === achievements.currentLevel;
              const isAchieved = achievements.totalCompletedJobs >= level.minJobs;
              const levelProgress = isCurrentLevel 
                ? ((achievements.totalCompletedJobs - level.minJobs) / (level.maxJobs - level.minJobs)) * 100
                : 0;
              
              return (
                <Card 
                  key={level.level} 
                  className={`transition-all duration-300 h-full ${
                    isCurrentLevel ? 'border-primary shadow-md glassmorphism border-2' : 
                    isAchieved ? 'glassmorphism' : 'opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" 
                        style={{ backgroundColor: `${level.color}20` }}
                      >
                        <Trophy className="h-6 w-6" style={{ color: level.color }} />
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{level.name}</h4>
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {level.minJobs === 0 ? '0' : level.minJobs}{level.maxJobs !== Infinity ? `-${level.maxJobs}` : '+'} trabajos
                      </p>
                      
                      <Progress 
                        value={isAchieved ? 100 : isCurrentLevel ? levelProgress : 0} 
                        className="h-2 mb-2" 
                      />
                      
                      {isCurrentLevel && (
                        <LevelBadge level={level.level} size="sm" showText={false} />
                      )}
                      {isAchieved && !isCurrentLevel && (
                        <div className="text-xs text-green-600 font-medium">Completado</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Historial de Calificaciones */}
        <RatingHistoryComponent 
          ratingHistory={achievements.ratingHistory} 
          isLoading={isLoading} 
        />
      </div>
    </PageContainer>
  );
};

export default Achievements;

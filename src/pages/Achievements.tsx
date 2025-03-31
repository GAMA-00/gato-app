import React from 'react';
import { Award, Star, CheckCircle, Share2, Shield, Trophy, User, Users, Zap, Calendar, Repeat } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import PageContainer from '@/components/layout/PageContainer';
import { ACHIEVEMENT_LEVELS, getProviderAchievements } from '@/lib/data';
import { Achievement, AchievementLevelInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ReactNode> = {
  'user': <User className="h-5 w-5" />,
  'shield': <Shield className="h-5 w-5" />,
  'star': <Star className="h-5 w-5" />,
  'award': <Award className="h-5 w-5" />,
  'check-circle': <CheckCircle className="h-5 w-5" />,
  'share': <Share2 className="h-5 w-5" />,
  'milestone': <Trophy className="h-5 w-5" />,
  'calendar-check': <Calendar className="h-5 w-5" />,
  'repeat': <Repeat className="h-5 w-5" />,
  'zap': <Zap className="h-5 w-5" />,
  'users': <Users className="h-5 w-5" />,
};

const AchievementCard: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const completionCount = achievement.completionCount || 0;
  const isCompleted = completionCount > 0;
  
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={achievement.id} className="border-b">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-4 w-full">
            <div className={`p-2 rounded-full ${isCompleted ? 'bg-primary/20' : 'bg-muted'}`}>
              {iconMap[achievement.icon] || <Trophy className="h-5 w-5" />}
            </div>
            <div className="flex flex-1 items-center justify-between">
              <div>
                <h3 className="font-medium text-left">{achievement.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 text-left">{achievement.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="ml-auto">
                  {achievement.points} pts
                </Badge>
                {isCompleted && (
                  <Badge className="bg-amber-500 text-white">
                    x{completionCount}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-12">
          <div className="space-y-4">
            {isCompleted ? (
              <div className="space-y-3">
                <h4 className="font-medium">Completado {completionCount} {completionCount === 1 ? 'vez' : 'veces'}</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Puntos Ganados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from({ length: completionCount }).map((_, index) => {
                      const date = new Date(achievement.completedAt || new Date());
                      date.setDate(date.getDate() - (index * 15));
                      
                      return (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{date.toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">{achievement.points}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-between text-sm">
                  <span>Total puntos: {achievement.points * completionCount}</span>
                  <span className="text-primary cursor-pointer hover:underline">
                    Consigue de nuevo
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Aún no has completado este logro</p>
                <Button className="mt-2">
                  Completar ahora
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
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
          <CardTitle className="text-lg truncate pr-2 min-h-7">
            {level.name}
          </CardTitle>
          <div 
            className="p-2 rounded-full flex-shrink-0" 
            style={{ backgroundColor: `${level.color}20` }}
          >
            {iconMap[level.icon] || <Trophy className="h-5 w-5" style={{ color: level.color }} />}
          </div>
        </div>
        <CardDescription className="line-clamp-3 min-h-[4.5rem]">{level.description}</CardDescription>
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

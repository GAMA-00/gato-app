
export type AchievementLevel = 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante';

export interface AchievementLevelInfo {
  level: AchievementLevel;
  name: string;
  description: string;
  minJobs: number;
  maxJobs: number;
  color: string;
  icon: string;
}

export interface RatingHistory {
  id: string;
  clientName: string;
  appointmentDate: Date;
  servicePrice: number;
  rating: number;
  serviceName?: string;
}

export interface ProviderAchievements {
  totalCompletedJobs: number;
  currentLevel: AchievementLevel;
  nextLevel: AchievementLevel | null;
  jobsToNextLevel: number;
  averageRating: number;
  ratingHistory: RatingHistory[];
}

export const ACHIEVEMENT_LEVELS: AchievementLevelInfo[] = [
  {
    level: 'bronce',
    name: 'Bronce',
    description: 'Proveedor principiante con experiencia inicial',
    minJobs: 0,
    maxJobs: 30,
    color: '#CD7F32',
    icon: 'award'
  },
  {
    level: 'plata',
    name: 'Plata',
    description: 'Proveedor experimentado con historial sólido',
    minJobs: 31,
    maxJobs: 100,
    color: '#C0C0C0',
    icon: 'star'
  },
  {
    level: 'oro',
    name: 'Oro',
    description: 'Proveedor altamente calificado y confiable',
    minJobs: 101,
    maxJobs: 500,
    color: '#FFD700',
    icon: 'trophy'
  },
  {
    level: 'platino',
    name: 'Platino',
    description: 'Proveedor elite con excelencia demostrada',
    minJobs: 501,
    maxJobs: 1000,
    color: '#E5E4E2',
    icon: 'crown'
  },
  {
    level: 'diamante',
    name: 'Diamante',
    description: 'Proveedor maestro con trayectoria excepcional',
    minJobs: 1001,
    maxJobs: Infinity,
    color: '#B9F2FF',
    icon: 'gem'
  }
];

export function getProviderLevelByJobs(completedJobs: number): AchievementLevelInfo {
  for (let i = ACHIEVEMENT_LEVELS.length - 1; i >= 0; i--) {
    if (completedJobs >= ACHIEVEMENT_LEVELS[i].minJobs) {
      return ACHIEVEMENT_LEVELS[i];
    }
  }
  return ACHIEVEMENT_LEVELS[0];
}

export function getNextLevel(currentLevel: AchievementLevel): AchievementLevelInfo | null {
  const currentIndex = ACHIEVEMENT_LEVELS.findIndex(level => level.level === currentLevel);
  if (currentIndex < ACHIEVEMENT_LEVELS.length - 1) {
    return ACHIEVEMENT_LEVELS[currentIndex + 1];
  }
  return null;
}

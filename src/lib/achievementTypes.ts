
export type AchievementLevel = 'nuevo' | 'bronce' | 'plata' | 'oro' | 'platino' | 'diamante';

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
  comment?: string;
}

export interface ProviderAchievements {
  totalCompletedJobs: number;
  currentLevel: AchievementLevel;
  nextLevel: AchievementLevel | null;
  jobsToNextLevel: number;
  averageRating: number;
  ratingHistory: RatingHistory[];
  recurringClientsCount: number;
}

export const ACHIEVEMENT_LEVELS: AchievementLevelInfo[] = [
  {
    level: 'nuevo',
    name: 'Nuevo',
    description: 'Proveedor recién registrado comenzando su trayectoria',
    minJobs: 0,
    maxJobs: 29,
    color: '#3B82F6',
    icon: 'award'
  },
  {
    level: 'bronce',
    name: 'Bronce',
    description: 'Has completado tus primeros trabajos y construyes tu reputación',
    minJobs: 30,
    maxJobs: 99,
    color: '#CD7F32',
    icon: 'award'
  },
  {
    level: 'plata',
    name: 'Plata',
    description: 'Proveedor experimentado con historial sólido de trabajos completados',
    minJobs: 100,
    maxJobs: 499,
    color: '#C0C0C0',
    icon: 'star'
  },
  {
    level: 'oro',
    name: 'Oro',
    description: 'Proveedor altamente calificado con cientos de trabajos completados',
    minJobs: 500,
    maxJobs: 999,
    color: '#FFD700',
    icon: 'trophy'
  },
  {
    level: 'platino',
    name: 'Platino',
    description: 'Proveedor elite con más de mil trabajos completados exitosamente',
    minJobs: 1000,
    maxJobs: 2499,
    color: '#E5E4E2',
    icon: 'crown'
  },
  {
    level: 'diamante',
    name: 'Diamante',
    description: 'Proveedor maestro con trayectoria excepcional de miles de trabajos',
    minJobs: 2500,
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

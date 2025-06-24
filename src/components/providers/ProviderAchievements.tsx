
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, TrendingUp } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import LevelBadge from '@/components/achievements/LevelBadge';
import { useProviderMerits } from '@/hooks/useProviderMerits';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider }: ProviderAchievementsProps) => {
  const { data: merits, isLoading } = useProviderMerits(provider.id);

  if (isLoading) {
    return (
      <Card className="bg-white border border-stone-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium text-stone-800">
            Méritos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between gap-6">
            <div className="text-center">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    averageRating,
    recurringClientsCount,
    completedJobsCount,
    providerLevel
  } = merits || {
    averageRating: 5.0,
    recurringClientsCount: 0,
    completedJobsCount: 0,
    providerLevel: { level: 'nuevo', name: 'Nuevo', color: '#3B82F6' }
  };

  return (
    <Card className="bg-white border border-stone-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            Méritos
            <LevelBadge level={providerLevel.level} size="md" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between gap-6">
          {/* Calificación Promedio */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Star className="h-5 w-5 text-amber-600 fill-amber-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Calificación promedio
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {averageRating.toFixed(1)}
            </div>
          </div>

          {/* Trabajos Completados */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-3">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Trabajos completados
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {completedJobsCount}
            </div>
          </div>

          {/* Clientes Recurrentes */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Clientes recurrentes
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {recurringClientsCount}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;

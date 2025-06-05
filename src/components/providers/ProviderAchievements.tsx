
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, Award } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider, recurringClientsCount = 0 }: ProviderAchievementsProps) => {
  // Calculate experience level from 1 to 5 based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 1;
    if (years < 2) return 2;
    if (years < 4) return 3;
    if (years < 7) return 4;
    return 5;
  };

  const experienceLevel = getExperienceLevel(provider.experienceYears);
  
  // Use actual rating or default to 5.0 for new providers
  const displayRating = provider.rating && provider.rating > 0 ? provider.rating : 5.0;

  return (
    <Card className="bg-white border border-stone-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-stone-800">
          Méritos
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
              {displayRating.toFixed(1)}
            </div>
          </div>

          {/* Clientes Recurrentes */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Clientes recurrentes
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {recurringClientsCount}
            </div>
          </div>

          {/* Nivel de Experiencia */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Nivel de experiencia
            </div>
            <div className="text-lg font-semibold text-stone-800">
              Nivel {experienceLevel}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;

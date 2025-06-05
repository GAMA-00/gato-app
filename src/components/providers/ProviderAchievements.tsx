
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, Award } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider, recurringClientsCount = 0 }: ProviderAchievementsProps) => {
  // Determine experience level based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 'Novato';
    if (years < 3) return 'Confiable';
    if (years < 5) return 'Recomendado';
    return 'Experto';
  };

  // Render rating stars
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="h-3 w-3 fill-amber-500 text-amber-500" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative h-3 w-3">
            <Star className="h-3 w-3 text-stone-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className="h-3 w-3 text-stone-300" />
        );
      }
    }
    return stars;
  };

  const experienceLevel = getExperienceLevel(provider.experienceYears);

  return (
    <Card className="bg-amber-50 border-amber-100 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-stone-700">
          Méritos Profesionales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Calificación */}
          {provider.rating && provider.rating > 0 && (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Star className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-stone-600 mb-1">
                  Calificación
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {renderStars(provider.rating)}
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    {provider.rating.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clientes Recurrentes */}
          {recurringClientsCount > 0 && (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                <Users className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-medium text-stone-600 mb-1">
                  Clientes recurrentes
                </div>
                <div className="text-sm font-semibold text-stone-700">
                  {recurringClientsCount} {recurringClientsCount === 1 ? 'cliente' : 'clientes'}
                </div>
              </div>
            </div>
          )}

          {/* Nivel de Experiencia */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Award className="h-4 w-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-stone-600 mb-1">
                Nivel de experiencia
              </div>
              <div className="text-sm font-semibold text-stone-700">
                {experienceLevel}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;

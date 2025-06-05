
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
          <Star key={i} className="h-3 w-3 fill-amber-600 text-amber-600" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative h-3 w-3">
            <Star className="h-3 w-3 text-stone-200" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-3 w-3 fill-amber-600 text-amber-600" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className="h-3 w-3 text-stone-200" />
        );
      }
    }
    return stars;
  };

  const experienceLevel = getExperienceLevel(provider.experienceYears);

  return (
    <Card className="bg-stone-50 border-stone-100 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium text-stone-800">
          Méritos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          {/* Calificación */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <Star className="h-5 w-5 text-stone-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500 mb-1">
                Calificación
              </div>
              {provider.rating && provider.rating > 0 ? (
                <div className="flex flex-col items-center space-y-1">
                  <div className="flex items-center gap-0.5">
                    {renderStars(provider.rating)}
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    {provider.rating.toFixed(1)}
                  </span>
                </div>
              ) : (
                <span className="text-sm font-semibold text-stone-500">
                  Sin calificar
                </span>
              )}
            </div>
          </div>

          {/* Clientes Recurrentes */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <Users className="h-5 w-5 text-stone-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500 mb-1">
                Clientes recurrentes
              </div>
              <div className="text-sm font-semibold text-stone-700">
                {recurringClientsCount}
              </div>
            </div>
          </div>

          {/* Nivel de Experiencia */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center">
              <Award className="h-5 w-5 text-stone-600" />
            </div>
            <div>
              <div className="text-xs font-medium text-stone-500 mb-1">
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

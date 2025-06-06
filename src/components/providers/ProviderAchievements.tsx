
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, Award } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider, recurringClientsCount = 0 }: ProviderAchievementsProps) => {
  // Calculate provider level based on account creation date (time on platform)
  const getProviderLevel = (joinDate: Date) => {
    const now = new Date();
    const accountAgeInMonths = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    if (accountAgeInMonths < 3) return { level: 1, name: 'Nuevo' };
    if (accountAgeInMonths < 12) return { level: 2, name: 'Aprendiz' };
    if (accountAgeInMonths < 24) return { level: 3, name: 'Avanzado' };
    if (accountAgeInMonths < 36) return { level: 4, name: 'Experto' };
    return { level: 5, name: 'Maestro' };
  };

  const providerLevel = getProviderLevel(provider.joinDate);
  
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

          {/* Nivel del Proveedor (basado en antigüedad en la plataforma) */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Award className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Nivel del proveedor
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {providerLevel.name}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;

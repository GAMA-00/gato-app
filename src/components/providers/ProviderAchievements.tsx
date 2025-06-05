
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Calendar, Award } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider, recurringClientsCount = 0 }: ProviderAchievementsProps) => {
  // Determine experience level based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return { name: 'Novato', color: 'text-amber-700', bgColor: 'bg-amber-50' };
    if (years < 3) return { name: 'Confiable', color: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (years < 5) return { name: 'Recomendado', color: 'text-emerald-700', bgColor: 'bg-emerald-50' };
    return { name: 'Experto', color: 'text-stone-700', bgColor: 'bg-stone-50' };
  };

  const experienceLevel = getExperienceLevel(provider.experienceYears);

  // Render rating stars
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative h-4 w-4">
            <Star className="h-4 w-4 text-stone-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star key={i} className="h-4 w-4 text-stone-300" />
        );
      }
    }
    return stars;
  };

  // Build achievements array with only available data
  const achievements = [];

  // 1. Average Rating - only show if provider has a rating
  if (provider.rating && provider.rating > 0) {
    achievements.push({
      icon: <Star className="h-5 w-5 text-amber-600" />,
      title: 'Calificación promedio',
      content: (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {renderStars(provider.rating)}
          </div>
          <span className="font-semibold text-stone-700">
            {provider.rating.toFixed(1)}
          </span>
          {provider.ratingCount > 0 && (
            <span className="text-sm text-stone-500">
              ({provider.ratingCount} {provider.ratingCount === 1 ? 'reseña' : 'reseñas'})
            </span>
          )}
        </div>
      )
    });
  }

  // 2. Experience Level - always show as it shows current provider status
  achievements.push({
    icon: <Award className="h-5 w-5 text-stone-600" />,
    title: 'Nivel de experiencia',
    content: (
      <Badge className={`${experienceLevel.bgColor} ${experienceLevel.color} border-stone-200 font-medium`}>
        {experienceLevel.name}
      </Badge>
    )
  });

  // 3. Recurring Clients - only show if there are recurring clients
  if (recurringClientsCount > 0) {
    achievements.push({
      icon: <Users className="h-5 w-5 text-stone-600" />,
      title: 'Clientes recurrentes',
      content: (
        <span className="font-semibold text-stone-700">
          {recurringClientsCount} {recurringClientsCount === 1 ? 'cliente' : 'clientes'}
        </span>
      )
    });
  }

  // 4. Join Date - always show as professional credential
  achievements.push({
    icon: <Calendar className="h-5 w-5 text-stone-600" />,
    title: 'Miembro desde',
    content: (
      <span className="font-medium text-stone-600">
        {format(provider.joinDate, 'MMMM yyyy', { locale: es })}
      </span>
    )
  });

  // Only render if we have achievements to show
  if (achievements.length === 0) {
    return null;
  }

  return (
    <Card className="bg-stone-50 border-stone-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-stone-800">
          Méritos Profesionales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => (
            <div 
              key={index} 
              className="flex items-start gap-3 p-3 bg-amber-25 rounded-lg border border-stone-100"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center shadow-sm">
                {achievement.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-stone-700 mb-1">
                  {achievement.title}
                </h4>
                <div className="text-sm">
                  {achievement.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderAchievements;

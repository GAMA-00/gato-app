
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Award, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProviderData } from '@/components/client/service/types';
import { ClientResidencia } from './types';

interface ProviderInfoCardProps {
  provider: ProviderData;
  recurringClients?: number;
  clientResidencia?: ClientResidencia | null;
}

const ProviderInfoCard = ({ 
  provider, 
  recurringClients = 0, 
  clientResidencia 
}: ProviderInfoCardProps) => {
  const experienceYears = provider?.experience_years || 0;
  
  // Calculate experience level from 1 to 5 based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 1;
    if (years < 2) return 2;
    if (years < 4) return 3;
    if (years < 7) return 4;
    return 5;
  };

  const experienceLevel = getExperienceLevel(experienceYears);
  
  // Use actual rating or default to 5.0 for new providers
  const displayRating = provider?.average_rating && provider.average_rating > 0 ? provider.average_rating : 5.0;
  
  console.log("ProviderInfoCard - Provider avatar URL:", provider?.avatar_url);
  console.log("ProviderInfoCard - Provider name:", provider?.name);
  
  return (
    <Card className="bg-app-card border border-app-border">
      <CardContent className="pt-6">
        <div className="flex items-start">
          <Avatar className="h-16 w-16 border border-app-border">
            <AvatarImage src={provider?.avatar_url} alt={provider?.name} />
            <AvatarFallback className="bg-app-cardAlt text-app-text">
              {provider?.name?.substring(0, 2).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-4 space-y-3">
            <h3 className="text-lg font-semibold text-app-text">{provider?.name || 'Proveedor'}</h3>
            
            {/* Metrics Row */}
            <div className="flex flex-wrap gap-2">
              {/* Calificación Promedio */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Star className="h-4 w-4 fill-amber-600 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">
                  {displayRating.toFixed(1)}
                </span>
              </div>
              
              {/* Clientes Recurrentes */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Users className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">{recurringClients}</span>
                <span className="text-amber-600 text-sm ml-1">recurrentes</span>
              </div>
              
              {/* Nivel de Experiencia */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Award className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">Nivel {experienceLevel}</span>
              </div>
              
              {/* Location Badge - Only show if client has a residence */}
              {clientResidencia && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-100 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {clientResidencia.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderInfoCard;

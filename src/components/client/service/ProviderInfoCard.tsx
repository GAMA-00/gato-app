
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Users, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProviderExperienceLevel from '@/components/client/results/ProviderExperienceLevel';
import { ProviderData } from '@/components/client/results/types';
import { ClientResidencia } from './types';

interface ProviderInfoCardProps {
  provider: ProviderData;
  recurringClients?: number;
  clientResidencia?: ClientResidencia | null;
}

const ProviderInfoCard = ({ 
  provider, 
  recurringClients, 
  clientResidencia 
}: ProviderInfoCardProps) => {
  const experienceYears = provider.experience_years || 0;
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start">
          <Avatar className="h-16 w-16">
            <AvatarImage src={undefined} alt={provider.name} />
            <AvatarFallback>
              {provider.name?.substring(0, 2).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-4 space-y-2">
            <h3 className="text-lg font-semibold">{provider.name}</h3>
            
            <div className="flex items-center">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
              <span className="font-medium">{provider.average_rating?.toFixed(1) || "Nuevo"}</span>
              <span className="text-muted-foreground text-sm ml-1">(9 reseñas)</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Experience Level Badge */}
              <ProviderExperienceLevel experienceYears={experienceYears} />
              
              {/* Certifications Badge */}
              {provider.hasCertifications && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Certificado
                </Badge>
              )}
              
              {/* Services Completed Badge */}
              {provider.servicesCompleted && provider.servicesCompleted > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {provider.servicesCompleted} servicios completados
                </Badge>
              )}
              
              {/* Recurring Clients Badge */}
              {recurringClients && recurringClients > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {recurringClients} clientes recurrentes
                </Badge>
              )}
              
              {/* Location Badge */}
              {clientResidencia && (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 flex items-center gap-1">
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

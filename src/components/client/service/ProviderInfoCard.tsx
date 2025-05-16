
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, BadgeCheck, Users, MapPin, Shield } from 'lucide-react';
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
  const experienceYears = provider?.experience_years || 0;
  const hasCertifications = provider?.certificationFiles && provider.certificationFiles.length > 0;
  
  return (
    <Card className="bg-luxury-white border border-neutral-100">
      <CardContent className="pt-6">
        <div className="flex items-start">
          <Avatar className="h-16 w-16 border border-neutral-100">
            <AvatarImage src={undefined} alt={provider?.name} />
            <AvatarFallback className="bg-luxury-beige text-luxury-navy">
              {provider?.name?.substring(0, 2).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-4 space-y-2">
            <h3 className="text-lg font-semibold text-luxury-navy">{provider?.name}</h3>
            
            <div className="flex items-center">
              <div className="bg-yellow-50 px-2 py-1 rounded-md flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium text-yellow-700">{provider?.average_rating?.toFixed(1) || "Nuevo"}</span>
                {provider?.ratingCount && provider.ratingCount > 0 && (
                  <span className="text-muted-foreground text-sm ml-1">({provider.ratingCount} reseñas)</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Experience Level Badge */}
              <ProviderExperienceLevel experienceYears={experienceYears} />
              
              {/* Trusted Provider */}
              {experienceYears > 2 && (
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Confiable
                </Badge>
              )}
              
              {/* Certifications Badge */}
              {hasCertifications && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  Certificado
                </Badge>
              )}
              
              {/* Services Completed Badge */}
              {provider?.servicesCompleted && provider.servicesCompleted > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {provider.servicesCompleted} servicios completados
                </Badge>
              )}
              
              {/* Recurring Clients Badge */}
              {recurringClients && recurringClients > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {recurringClients} clientes recurrentes
                </Badge>
              )}
              
              {/* Location Badge */}
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

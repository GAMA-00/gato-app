
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, MapPin } from 'lucide-react';
import { ProviderData } from '@/components/client/service/types';
import { ClientResidencia } from './types';
import LevelBadge from '@/components/achievements/LevelBadge';
import { useProviderMerits } from '@/hooks/useProviderMerits';
import { AchievementLevel } from '@/lib/achievementTypes';
import ProviderAvatar from '@/components/ui/provider-avatar';
import { logger } from '@/utils/logger';

interface ProviderInfoCardProps {
  provider: ProviderData;
  clientResidencia?: ClientResidencia | null;
}

const ProviderInfoCard = ({ 
  provider, 
  clientResidencia 
}: ProviderInfoCardProps) => {
  logger.debug('ProviderInfoCard - Provider data', {
    name: provider?.name,
    avatar_url: provider?.avatar_url,
    id: provider?.id
  });

  const { data: merits, isLoading } = useProviderMerits(provider?.id);

  if (isLoading) {
    return (
      <Card className="bg-app-card border border-app-border">
        <CardContent className="pt-6">
          <div className="text-center">Cargando información del proveedor...</div>
        </CardContent>
      </Card>
    );
  }

  const {
    averageRating,
    recurringClientsCount,
    ratingCount,
    providerLevel
  } = merits || {
    averageRating: 5.0,
    recurringClientsCount: 0,
    ratingCount: 0,
    providerLevel: { level: 'nuevo', name: 'Nuevo', color: '#3B82F6' }
  };
  
  return (
    <Card className="bg-app-card border border-app-border">
      <CardContent className="pt-6">
        <div className="flex items-start">
          <ProviderAvatar
            src={provider?.avatar_url}
            name={provider?.name || 'Proveedor'}
            className="h-16 w-16 border border-app-border"
          />
          
          <div className="ml-4 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-app-text">{provider?.name || 'Proveedor'}</h3>
              <LevelBadge level={providerLevel.level as AchievementLevel} size="sm" />
            </div>
            
            {/* Metrics Row */}
            <div className="flex flex-wrap gap-2">
              {/* Calificación Promedio Real */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Star className="h-4 w-4 fill-amber-600 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">
                  {averageRating.toFixed(1)}
                </span>
                {ratingCount > 0 && (
                  <span className="text-amber-600 text-sm ml-1">({ratingCount})</span>
                )}
              </div>
              
              {/* Clientes Recurrentes */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Users className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">{recurringClientsCount}</span>
                <span className="text-amber-600 text-sm ml-1">recurrentes</span>
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

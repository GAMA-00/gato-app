
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Award, MapPin } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProviderData } from '@/components/client/service/types';
import { ClientResidencia } from './types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  // Fetch REAL recurring clients count for this provider
  const { data: realRecurringClientsCount = recurringClients } = useQuery({
    queryKey: ['recurring-clients-real', provider?.id],
    queryFn: async () => {
      if (!provider?.id) return recurringClients;
      
      console.log('Fetching REAL recurring clients count for provider:', provider.id);
      
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('client_id')
        .eq('provider_id', provider.id)
        .eq('is_active', true)
        .in('recurrence_type', ['weekly', 'biweekly', 'monthly']);
        
      if (error) {
        console.error('Error fetching recurring clients count:', error);
        return recurringClients;
      }
      
      // Count unique clients
      const uniqueClients = new Set(data.map(rule => rule.client_id));
      const count = uniqueClients.size;
      
      console.log('Real recurring clients count:', count);
      
      return count;
    },
    enabled: !!provider?.id
  });

  // Calculate provider level based on account creation date (time on platform)
  const getProviderLevel = (createdAt?: string) => {
    if (!createdAt) return { level: 1, name: 'Nuevo' };
    
    const joinDate = new Date(createdAt);
    const now = new Date();
    const accountAgeInMonths = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    
    if (accountAgeInMonths < 3) return { level: 1, name: 'Nuevo' };
    if (accountAgeInMonths < 12) return { level: 2, name: 'Aprendiz' };
    if (accountAgeInMonths < 24) return { level: 3, name: 'Avanzado' };
    if (accountAgeInMonths < 36) return { level: 4, name: 'Experto' };
    return { level: 5, name: 'Maestro' };
  };

  const providerLevel = getProviderLevel(provider?.created_at);
  
  // Use actual rating or default to 5.0 for new providers
  const displayRating = provider?.average_rating && provider.average_rating > 0 ? provider.average_rating : 5.0;
  
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
              
              {/* Clientes Recurrentes - Using REAL count */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Users className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">{realRecurringClientsCount}</span>
                <span className="text-amber-600 text-sm ml-1">recurrentes</span>
              </div>
              
              {/* Nivel del Proveedor */}
              <div className="flex items-center bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                <Award className="h-4 w-4 text-amber-600 mr-2" />
                <span className="font-medium text-amber-700">{providerLevel.name}</span>
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

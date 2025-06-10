
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Star, Users, Award } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProviderAchievementsProps {
  provider: ProviderProfile;
  recurringClientsCount?: number;
}

const ProviderAchievements = ({ provider, recurringClientsCount = 0 }: ProviderAchievementsProps) => {
  // Fetch REAL recurring clients count for this provider
  const { data: realRecurringClientsCount = recurringClientsCount } = useQuery({
    queryKey: ['recurring-clients-real', provider.id],
    queryFn: async () => {
      if (!provider.id) return recurringClientsCount;
      
      console.log('Fetching REAL recurring clients count for provider:', provider.id);
      
      const { data, error } = await supabase
        .from('recurring_rules')
        .select('client_id')
        .eq('provider_id', provider.id)
        .eq('is_active', true)
        .in('recurrence_type', ['weekly', 'biweekly', 'monthly']);
        
      if (error) {
        console.error('Error fetching recurring clients count:', error);
        return recurringClientsCount;
      }
      
      // Count unique clients
      const uniqueClients = new Set(data.map(rule => rule.client_id));
      const count = uniqueClients.size;
      
      console.log('Real recurring clients count:', count);
      
      return count;
    },
    enabled: !!provider.id
  });

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

          {/* Clientes Recurrentes - Using REAL count */}
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <div className="text-xs font-medium text-stone-600 mb-1">
              Clientes recurrentes
            </div>
            <div className="text-lg font-semibold text-stone-800">
              {realRecurringClientsCount}
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

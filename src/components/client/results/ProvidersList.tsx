
import React, { useEffect } from 'react';
import { User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ProviderCard from './ProviderCard';
import { ProcessedProvider } from './types';
import { Card, CardContent } from '@/components/ui/card';

interface ProvidersListProps {
  providers: ProcessedProvider[];
  isLoading: boolean;
  onProviderSelect: (provider: ProcessedProvider) => void;
  onBack: () => void;
}

const ProvidersList = ({ providers, isLoading, onProviderSelect, onBack }: ProvidersListProps) => {
  // Log para depuración
  useEffect(() => {
    console.log("ProvidersList rendered with", providers.length, "providers");
    if (providers.length > 0) {
      console.log("First provider:", providers[0]);
    }
  }, [providers]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-0">
              <div className="flex p-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="ml-4 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="h-10 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (providers.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-2" />
        <p className="text-lg font-medium">No hay profesionales disponibles</p>
        <p className="text-muted-foreground mb-6">
          No encontramos profesionales para este servicio en este momento.
        </p>
        <Button onClick={onBack}>
          Volver a detalles de reserva
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {providers.map((provider) => (
        <ProviderCard 
          key={provider.id}
          provider={provider}
          onClick={onProviderSelect}
        />
      ))}
    </div>
  );
};

export default ProvidersList;

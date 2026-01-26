import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';

const LocationHeader = () => {
  const { profile, isLoading } = useUserProfile();

  const condominiumName = profile?.condominium_text || 'Sin ubicación';

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">
        Ubicación
      </span>
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {condominiumName}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};

export default LocationHeader;

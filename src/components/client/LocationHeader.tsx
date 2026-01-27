import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';

const LocationHeader = () => {
  const { profile, isLoading } = useUserProfile();

  const locationName = profile?.residencia_name || 'Sin ubicación';

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
        Ubicación
      </span>
      <div className="flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {locationName}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
    </div>
  );
};

export default LocationHeader;

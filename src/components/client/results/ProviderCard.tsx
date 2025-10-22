
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, ChevronRight, Clock, Users, Award } from 'lucide-react';
import { ProcessedProvider } from './types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useProviderServiceMerits } from '@/hooks/useProviderServiceMerits';
import ProviderAvatar from '@/components/ui/provider-avatar';

// Skeleton loader component
export const ProviderCardSkeleton = () => {
  return (
    <Card className="overflow-hidden bg-white border border-neutral-200 w-full rounded-2xl shadow-sm">
      <CardContent className="p-4 space-y-3">
        {/* Avatar + Nombre */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="flex gap-1.5">
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-12 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
          </div>
        </div>
        
        {/* Descripción */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        
        {/* Galería */}
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="aspect-square rounded-lg" />
        </div>
        
        {/* Meta */}
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
};

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  console.log('ProviderCard - Provider data:', {
    name: provider.name,
    avatar: provider.avatar,
    id: provider.id,
    listingId: provider.listingId
  });
  
  const isMobile = useIsMobile();
  const { data: merits } = useProviderServiceMerits(provider.id, provider.listingId);
  
  // Extract first line of service description instead of provider aboutMe
  const shortDescription = provider.serviceDescription?.split('\n')[0] || '';

  // Get all images from gallery (no limit)
  const allImages = provider.galleryImages || [];

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
    <Card 
      className={cn(
        "overflow-hidden cursor-pointer animate-fade-in bg-white border border-neutral-200 w-full",
        "rounded-2xl shadow-sm hover:shadow-md transition-all",
        "focus-within:ring-2 focus-within:ring-neutral-400 focus-within:ring-offset-2",
        "active:scale-[0.98]",
        isMobile ? "mx-0" : "mx-auto"
      )}
      onClick={() => onClick(provider)}
      tabIndex={0}
      role="button"
      aria-label={`Ver detalles de ${provider.name} - ${provider.serviceName}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(provider);
        }
      }}
    >
      <CardContent className="p-4 space-y-3">
        {/* Provider Info Section */}
        <div className="flex items-start gap-3">
          <ProviderAvatar
            src={provider.avatar}
            name={provider.name}
            size="md"
            className="border border-neutral-100 flex-shrink-0"
          />
          
          <div className="flex-1 min-w-0">
            {/* Name - Fila 1 */}
            <h3 className={cn(
              "font-semibold truncate", 
              isMobile ? "text-[17px] leading-tight text-[#2D2D2D]" : "text-base"
            )}>
              {provider.name}
            </h3>
            
            {/* Metrics Row - Fila 2: Chips compactos */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {/* Rating chip */}
              <div className="flex items-center bg-neutral-100 px-2 py-1 rounded-md border border-neutral-300 h-6">
                <Star className="h-3 w-3 fill-neutral-600 text-neutral-600 mr-1" />
                <span className="font-medium text-[12px] text-neutral-700">
                  {averageRating.toFixed(1)}
                </span>
                {ratingCount > 0 && (
                  <span className="text-[12px] text-neutral-600 ml-0.5">({ratingCount})</span>
                )}
              </div>
              
              {/* Recurring clients chip */}
              <div className="flex items-center bg-neutral-100 px-2 py-1 rounded-md border border-neutral-300 h-6">
                <Users className="h-3 w-3 text-neutral-600 mr-1" />
                <span className="font-medium text-[12px] text-neutral-700">{recurringClientsCount}</span>
              </div>
              
              {/* Provider level chip */}
              <div className="flex items-center bg-neutral-100 px-2 py-1 rounded-md border border-neutral-300 h-6">
                <Award className="h-3 w-3 text-neutral-600 mr-1" />
                <span className="font-medium text-[12px] text-neutral-700">{providerLevel.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service description - máx 2 líneas */}
        {shortDescription && (
          <p className={cn(
            "line-clamp-2", 
            isMobile ? "text-[14px] text-neutral-600 leading-snug" : "text-sm"
          )}>
            {shortDescription}
          </p>
        )}

        {/* Gallery - 3 miniaturas cuadradas + indicador +N */}
        {allImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {allImages.slice(0, 3).map((image, index) => {
              const isLastImage = index === 2;
              const remainingImages = allImages.length - 3;
              const showOverlay = isLastImage && remainingImages > 0;
              
              return (
                <div key={index} className="relative w-full aspect-square rounded-lg overflow-hidden bg-neutral-100">
                  <img 
                    src={image} 
                    alt={`Trabajo ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {showOverlay && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-semibold text-base">
                        +{remainingImages}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Meta: duración · precio + CTA "Ver detalles" */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-[14px] text-neutral-600">
            <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
            <span>
              {Math.floor(provider.duration / 60) > 0 ? `${Math.floor(provider.duration / 60)} h` : ''}
              {provider.duration % 60 > 0 ? ` ${provider.duration % 60} min` : ''}
            </span>
            <span className="mx-1.5">·</span>
            <span className="font-semibold text-[#2D2D2D]">${provider.price}</span>
          </div>
          
          {/* CTA: "Ver detalles" con chevron */}
          <div className="flex items-center text-[14px] text-neutral-600">
            <span className="mr-1">Ver detalles</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCard;

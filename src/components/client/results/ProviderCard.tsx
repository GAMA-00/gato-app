
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock, Users, Award } from 'lucide-react';
import { ProcessedProvider } from './types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useProviderMerits } from '@/hooks/useProviderMerits';

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  const isMobile = useIsMobile();
  const { data: merits } = useProviderMerits(provider.id);
  
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
        "overflow-hidden hover:shadow-luxury transition-shadow cursor-pointer animate-fade-in bg-[#F2F2F2] border border-neutral-100 w-full",
        isMobile ? "mx-0" : "mx-auto"
      )}
      onClick={() => onClick(provider)}
    >
      <CardContent className={cn("p-4", isMobile ? "p-3" : "p-4")}>
        {/* Provider Info Section */}
        <div className="flex items-start mb-3">
          <Avatar className={cn("border border-neutral-100 flex-shrink-0", isMobile ? "h-10 w-10" : "h-12 w-12")}>
            <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
            <AvatarFallback className="bg-luxury-beige text-luxury-navy">
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className={cn("font-medium text-luxury-navy truncate", isMobile ? "text-sm" : "text-base")}>{provider.name}</h3>
            </div>
            
            {/* Metrics Row - Optimized for mobile */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Calificación Real */}
              <div className="flex items-center bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 flex-shrink-0">
                <Star className="h-2.5 w-2.5 fill-amber-600 text-amber-600 mr-0.5" />
                <span className="font-medium text-xs text-amber-700">
                  {averageRating.toFixed(1)}
                </span>
                {ratingCount > 0 && (
                  <span className="text-xs text-amber-600 ml-0.5">({ratingCount})</span>
                )}
              </div>
              
              {/* Clientes Recurrentes */}
              <div className="flex items-center bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 flex-shrink-0">
                <Users className="h-2.5 w-2.5 text-amber-600 mr-0.5" />
                <span className="font-medium text-xs text-amber-700">{recurringClientsCount}</span>
              </div>
              
              {/* Nivel del Proveedor */}
              <div className="flex items-center bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200 flex-shrink-0">
                <Award className="h-2.5 w-2.5 text-amber-600 mr-0.5" />
                <span className="font-medium text-xs text-amber-700">{providerLevel.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Info Section */}
        <div className="border-t border-neutral-100 pt-3">
          <h4 className={cn("font-semibold text-luxury-navy mb-1", isMobile ? "text-sm" : "text-base")}>{provider.serviceName}</h4>
          
          {/* Service description */}
          {shortDescription && (
            <p className={cn("text-luxury-gray-dark mb-3 line-clamp-2", isMobile ? "text-xs" : "text-sm")}>
              {shortDescription}
            </p>
          )}

          {/* Gallery Preview Section - Optimized for mobile */}
          {allImages.length > 0 && (
            <div className="mb-3">
              <div className={cn("grid gap-1", isMobile ? "grid-cols-4" : "grid-cols-4")}>
                {allImages.slice(0, 4).map((image, index) => (
                  <div key={index} className={cn("relative w-full rounded-md overflow-hidden bg-gray-100", isMobile ? "h-12" : "h-16")}>
                    <img 
                      src={image} 
                      alt={`Trabajo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Price and Duration Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-luxury-gray-dark">
              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {Math.floor(provider.duration / 60) > 0 ? `${Math.floor(provider.duration / 60)}h ` : ''}
                {provider.duration % 60 > 0 ? `${provider.duration % 60}min` : ''}
              </span>
            </div>
            
            <div className="flex items-center flex-shrink-0">
              <span className={cn("font-medium mr-2 text-luxury-navy", isMobile ? "text-sm" : "text-base")}>${provider.price.toFixed(2)}</span>
              <ChevronRight className="h-4 w-4 text-luxury-gray-dark" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCard;


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock, Users, Award, ImageIcon } from 'lucide-react';
import { ProcessedProvider } from './types';
import { Badge } from '@/components/ui/badge';

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  // Extract first line of service description instead of provider aboutMe
  const shortDescription = provider.serviceDescription?.split('\n')[0] || '';

  // Get all images from gallery (no limit)
  const allImages = provider.galleryImages || [];

  // Calculate provider level based on time on platform
  const getProviderLevel = (joinDate?: Date) => {
    if (!joinDate) return { level: 1, name: 'Nuevo' };
    
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
    <Card 
      key={provider.id}
      className="overflow-hidden hover:shadow-luxury transition-shadow cursor-pointer animate-fade-in bg-[#F2F2F2] border border-neutral-100"
      onClick={() => onClick(provider)}
    >
      <CardContent className="p-4">
        {/* Provider Info Section */}
        <div className="flex items-start mb-3">
          <Avatar className="h-12 w-12 border border-neutral-100 flex-shrink-0">
            <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
            <AvatarFallback className="bg-luxury-beige text-luxury-navy">
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-luxury-navy truncate">{provider.name}</h3>
            </div>
            
            {/* Metrics Row - Reorganized for better desktop layout */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Calificación */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex-shrink-0">
                <Star className="h-3 w-3 fill-amber-600 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">
                  {displayRating.toFixed(1)}
                </span>
              </div>
              
              {/* Clientes Recurrentes - Using the actual count from provider data */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex-shrink-0">
                <Users className="h-3 w-3 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">{provider.recurringClients}</span>
              </div>
              
              {/* Nivel del Proveedor */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200 flex-shrink-0">
                <Award className="h-3 w-3 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">{providerLevel.name}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Info Section */}
        <div className="border-t border-neutral-100 pt-3">
          <h4 className="font-semibold text-sm text-luxury-navy mb-1">{provider.serviceName}</h4>
          
          {/* Service description instead of provider about me */}
          {shortDescription && (
            <p className="text-xs text-luxury-gray-dark mb-3 line-clamp-2">
              {shortDescription}
            </p>
          )}

          {/* Gallery Preview Section */}
          {allImages.length > 0 && (
            <div className="mb-3">
              <div className="grid grid-cols-4 gap-1">
                {allImages.map((image, index) => (
                  <div key={index} className="relative w-full h-16 rounded-md overflow-hidden bg-gray-100">
                    <img 
                      src={image} 
                      alt={`Trabajo ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Hide broken images
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
              <span className="font-medium text-base mr-2 text-luxury-navy">${provider.price.toFixed(2)}</span>
              <ChevronRight className="h-4 w-4 text-luxury-gray-dark" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCard;

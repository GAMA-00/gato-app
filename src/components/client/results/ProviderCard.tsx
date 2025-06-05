
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
  // Extract first line of description
  const shortDescription = provider.aboutMe?.split('\n')[0] || '';

  // Get all images from gallery (no limit)
  const allImages = provider.galleryImages || [];

  // Determine experience level based on years
  const getExperienceLevel = (years: number) => {
    if (years < 1) return 'Novato';
    if (years < 3) return 'Confiable';
    if (years < 5) return 'Recomendado';
    return 'Experto';
  };

  const experienceLevel = getExperienceLevel(provider.experience || 0);

  return (
    <Card 
      key={provider.id}
      className="overflow-hidden hover:shadow-luxury transition-shadow cursor-pointer animate-fade-in bg-[#F2F2F2] border border-neutral-100"
      onClick={() => onClick(provider)}
    >
      <CardContent className="p-4">
        {/* Provider Info Section */}
        <div className="flex items-start mb-3">
          <Avatar className="h-12 w-12 border border-neutral-100">
            <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
            <AvatarFallback className="bg-luxury-beige text-luxury-navy">
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-3 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-luxury-navy">{provider.name}</h3>
            </div>
            
            {/* Metrics Row */}
            <div className="flex items-center gap-3 mt-2">
              {/* Calificación */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Star className="h-3 w-3 fill-amber-600 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">
                  {provider.rating > 0 ? provider.rating.toFixed(1) : "Nuevo"}
                </span>
              </div>
              
              {/* Clientes Recurrentes */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Users className="h-3 w-3 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">{provider.recurringClients}</span>
              </div>
              
              {/* Nivel de Experiencia */}
              <div className="flex items-center bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Award className="h-3 w-3 text-amber-600 mr-1" />
                <span className="font-medium text-xs text-amber-700">{experienceLevel}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Service Info Section */}
        <div className="border-t border-neutral-100 pt-2">
          <h4 className="font-semibold text-sm text-luxury-navy">{provider.serviceName}</h4>
          
          {/* Short description */}
          {shortDescription && (
            <p className="text-xs text-luxury-gray-dark mt-1 line-clamp-2">
              {shortDescription}
            </p>
          )}

          {/* Gallery Preview Section - Now below service name and description */}
          {allImages.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center mb-2">
                <ImageIcon className="h-3 w-3 mr-1 text-gray-500" />
                <span className="text-xs text-gray-600">Ejemplos de trabajo</span>
              </div>
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
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center text-xs text-luxury-gray-dark">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(provider.duration / 60) > 0 ? `${Math.floor(provider.duration / 60)}h ` : ''}
              {provider.duration % 60 > 0 ? `${provider.duration % 60}min` : ''}
            </div>
            
            <div className="flex items-center">
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

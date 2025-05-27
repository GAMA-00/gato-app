
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock, BadgeCheck, Users, Shield, ImageIcon } from 'lucide-react';
import { ProcessedProvider } from './types';
import { Badge } from '@/components/ui/badge';
import ProviderExperienceLevel from './ProviderExperienceLevel';

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  // Extract first line of description
  const shortDescription = provider.aboutMe?.split('\n')[0] || '';

  // Get preview images from gallery (max 3)
  const previewImages = provider.galleryImages?.slice(0, 3) || [];

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
              <div className="flex items-center bg-yellow-50 px-1.5 py-0.5 rounded-md">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium text-sm text-yellow-700">{provider.rating > 0 ? provider.rating.toFixed(1) : "Nuevo"}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-1">
              {/* Experience Level - Always show this as it represents the provider's current level */}
              <ProviderExperienceLevel experienceYears={provider.experience || 0} />
              
              {/* Certifications Badge - Only show if provider has certifications */}
              {provider.hasCertifications && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1 text-xs py-0.5">
                  <BadgeCheck className="h-3 w-3" />
                  Certificado
                </Badge>
              )}
              
              {/* Services Completed - Only show if there are completed services */}
              {provider.servicesCompleted > 0 && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 flex items-center gap-1 text-xs py-0.5">
                  <Users className="h-3 w-3" />
                  {provider.servicesCompleted} servicios
                </Badge>
              )}
              
              {/* Recurring Clients - Only show if there are recurring clients */}
              {provider.recurringClients > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-100 flex items-center gap-1 text-xs py-0.5">
                  <Users className="h-3 w-3" />
                  {provider.recurringClients} recurrentes
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Preview Section */}
        {previewImages.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center mb-2">
              <ImageIcon className="h-3 w-3 mr-1 text-gray-500" />
              <span className="text-xs text-gray-600">Ejemplos de trabajo</span>
            </div>
            <div className="flex gap-1">
              {previewImages.map((image, index) => (
                <div key={index} className="relative w-16 h-12 rounded-md overflow-hidden bg-gray-100">
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
              {previewImages.length < 3 && (
                <div className="flex items-center justify-center w-16 h-12 rounded-md bg-gray-50 border border-gray-200">
                  <ImageIcon className="h-4 w-4 text-gray-300" />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Service Info Section */}
        <div className="border-t border-neutral-100 pt-2">
          <h4 className="font-semibold text-sm text-luxury-navy">{provider.serviceName}</h4>
          
          {/* Short description */}
          {shortDescription && (
            <p className="text-xs text-luxury-gray-dark mt-1 line-clamp-2">
              {shortDescription}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
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

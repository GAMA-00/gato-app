
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock, BadgeCheck, Users } from 'lucide-react';
import { ProcessedProvider } from './types';
import { Badge } from '@/components/ui/badge';

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  // Extract first line of description
  const shortDescription = provider.aboutMe?.split('\n')[0] || '';

  return (
    <Card 
      key={provider.id}
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
      onClick={() => onClick(provider)}
    >
      <CardContent className="p-0">
        {/* Service Image */}
        {provider.serviceImage && (
          <div className="relative h-48 w-full">
            <img 
              src={provider.serviceImage} 
              alt={provider.serviceName} 
              className="h-full w-full object-cover"
            />
          </div>
        )}
        
        <div className="p-4">
          {/* Provider Info Section */}
          <div className="flex items-start mb-3">
            <Avatar className="h-16 w-16">
              <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
              <AvatarFallback>
                {provider.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">{provider.name}</h3>
                <div className="flex items-center">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                  <span className="font-medium">{provider.rating.toFixed(1)}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-1">
                {/* Certification Badge */}
                {provider.hasCertifications && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3" />
                    Certificado
                  </Badge>
                )}
                
                {/* Recurring Clients Badge */}
                {provider.recurringClients > 0 && (
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {provider.recurringClients} clientes recurrentes
                  </Badge>
                )}
                
                {/* Available Badge */}
                {provider.isAvailable ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Disponible
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Disponible más tarde
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          {/* Service Info Section */}
          <div className="border-t pt-3">
            <h4 className="font-semibold">{provider.serviceName}</h4>
            
            {/* Short description */}
            {shortDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {shortDescription}
              </p>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                {Math.floor(provider.duration / 60) > 0 ? `${Math.floor(provider.duration / 60)}h ` : ''}
                {provider.duration % 60 > 0 ? `${provider.duration % 60}min` : ''}
              </div>
              
              <div className="flex items-center">
                <span className="font-medium text-lg mr-2">${provider.price.toFixed(2)}</span>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCard;

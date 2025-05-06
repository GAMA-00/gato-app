
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock, BadgeCheck, Users } from 'lucide-react';
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

  return (
    <Card 
      key={provider.id}
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer animate-fade-in"
      onClick={() => onClick(provider)}
    >
      <CardContent className="p-3">
        {/* Provider Info Section */}
        <div className="flex items-start mb-2">
          <Avatar className="h-10 w-10">
            <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
            <AvatarFallback>
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="ml-2 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-base">{provider.name}</h3>
              <div className="flex items-center">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium text-sm">{provider.rating.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mt-1">
              {/* Experience Level */}
              {provider.experience !== undefined && (
                <ProviderExperienceLevel experienceYears={provider.experience} />
              )}
              
              {/* Services Completed */}
              {provider.servicesCompleted > 0 && (
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  {provider.servicesCompleted} servicios
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Service Info Section */}
        <div className="border-t pt-2">
          <h4 className="font-semibold text-sm">{provider.serviceName}</h4>
          
          {/* Short description */}
          {shortDescription && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {shortDescription}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(provider.duration / 60) > 0 ? `${Math.floor(provider.duration / 60)}h ` : ''}
              {provider.duration % 60 > 0 ? `${provider.duration % 60}min` : ''}
            </div>
            
            <div className="flex items-center">
              <span className="font-medium text-base mr-2">${provider.price.toFixed(2)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProviderCard;


import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, ChevronRight, Clock } from 'lucide-react';
import { ProcessedProvider } from './types';
import { Badge } from '@/components/ui/badge';

interface ProviderCardProps {
  provider: ProcessedProvider;
  onClick: (provider: ProcessedProvider) => void;
}

const ProviderCard = ({ provider, onClick }: ProviderCardProps) => {
  return (
    <Card 
      key={provider.id}
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onClick(provider)}
    >
      <CardContent className="p-0">
        <div className="flex p-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={provider.avatar || undefined} alt={provider.name} />
            <AvatarFallback>
              {provider.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Información */}
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{provider.name}</h3>
              <div className="flex items-center">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                <span className="font-medium">{provider.rating.toFixed(1)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">
                {provider.experience} {provider.experience === 1 ? 'año' : 'años'} de experiencia
              </p>
              
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
            
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{provider.serviceName}</span>
                <span className="text-xs text-muted-foreground flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {Math.floor(provider.duration / 60)}h {provider.duration % 60}min
                </span>
              </div>
              
              <div className="flex items-center">
                <div className="mr-2 text-right">
                  <span className="font-medium">${provider.price.toFixed(2)}</span>
                </div>
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

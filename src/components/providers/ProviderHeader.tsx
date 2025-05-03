
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';

interface ProviderHeaderProps {
  provider: ProviderProfile;
  bookingMode?: boolean;
}

const ProviderHeader = ({ provider, bookingMode = false }: ProviderHeaderProps) => {
  // Handle scroll to services section
  const handleScrollToServices = () => {
    const servicesSection = document.getElementById('provider-services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <Avatar className="h-24 w-24 border-2 border-luxury-navy">
          <AvatarImage src={provider.avatar} alt={provider.name} />
          <AvatarFallback>{provider.name.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 text-center md:text-left">
          {/* Nombre y valoración */}
          <h2 className="text-2xl font-semibold mb-2">{provider.name}</h2>
          
          <div className="flex items-center justify-center md:justify-start mb-4">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
            <span className="font-medium">{provider.rating.toFixed(1)}</span>
            <span className="text-muted-foreground ml-1">
              ({provider.ratingCount} valoraciones)
            </span>
          </div>
          
          {/* Descripción breve */}
          <p className="text-muted-foreground line-clamp-2 mb-4">
            {provider.aboutMe.substring(0, 120)}...
          </p>
        </div>
        
        {/* Botón de acción */}
        {bookingMode && (
          <div className="w-full md:w-auto">
            <Button 
              onClick={handleScrollToServices}
              size="lg" 
              className="w-full md:w-auto bg-luxury-navy hover:bg-luxury-navy/90"
            >
              Elegir servicio
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderHeader;

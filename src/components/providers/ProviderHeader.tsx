
import React from 'react';
import { Button } from '@/components/ui/button';
import ProviderAvatar from '@/components/ui/provider-avatar';
import { Star } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import { useProviderMerits } from '@/hooks/useProviderMerits';

interface ProviderHeaderProps {
  provider: ProviderProfile;
  bookingMode?: boolean;
}

const ProviderHeader = ({ provider, bookingMode = false }: ProviderHeaderProps) => {
  const { data: merits } = useProviderMerits(provider.id);

  // Handle scroll to services section
  const handleScrollToServices = () => {
    const servicesSection = document.getElementById('provider-services');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const {
    averageRating,
    ratingCount
  } = merits || {
    averageRating: 5.0,
    ratingCount: 0
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <ProviderAvatar 
          src={provider.avatar}
          name={provider.name}
          className="h-24 w-24 border-2 border-luxury-navy"
        />
        
        <div className="flex-1 text-center md:text-left">
          {/* Nombre y valoración con sistema de 5 estrellas base */}
          <h2 className="text-2xl font-semibold mb-2">{provider.name}</h2>
          
          <div className="flex items-center justify-center md:justify-start mb-4">
            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
            <span className="font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground ml-1">
              ({ratingCount} {ratingCount === 1 ? 'valoración' : 'valoraciones'})
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

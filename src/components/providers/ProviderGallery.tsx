
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import ServiceGallery from '@/components/client/results/ServiceGallery';

interface ProviderGalleryProps {
  provider: ProviderProfile;
}

const ProviderGallery = ({ provider }: ProviderGalleryProps) => {
  // Use provider images if available, otherwise use placeholder images
  const images = provider.galleryImages && provider.galleryImages.length > 0 
    ? provider.galleryImages 
    : [
        'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b',
        'https://images.unsplash.com/photo-1518770660439-4636190af475',
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6'
      ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Galería de trabajos</CardTitle>
        
        <Button variant="ghost" size="sm" className="text-luxury-navy">
          Ver todos <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        <ServiceGallery 
          images={images}
          showExpandButton={true}
          maxPreview={6}
        />
      </CardContent>
    </Card>
  );
};

export default ProviderGallery;

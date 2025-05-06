
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
  // Placeholder images for demo purposes
  const demoImages = [
    'https://placehold.co/600x400?text=Trabajo+1',
    'https://placehold.co/600x400?text=Trabajo+2',
    'https://placehold.co/600x400?text=Trabajo+3',
    'https://placehold.co/600x400?text=Trabajo+4',
    'https://placehold.co/600x400?text=Trabajo+5',
  ];
  
  // Use provider images if available, otherwise use demo images
  const images = provider.galleryImages.length > 0 ? provider.galleryImages : demoImages;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle>Galería</CardTitle>
        
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

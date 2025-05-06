
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
  // Solo usar las imágenes que el proveedor ha subido
  const images = provider.galleryImages && provider.galleryImages.length > 0 
    ? provider.galleryImages 
    : [];

  // Si no hay imágenes, mostrar un mensaje en lugar de usar imágenes de ejemplo
  if (images.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Galería de trabajos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            Este proveedor aún no ha subido imágenes de sus trabajos.
          </div>
        </CardContent>
      </Card>
    );
  }

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

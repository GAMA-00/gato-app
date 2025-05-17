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
  // Use gallery images if available
  let images: string[] = [];
  
  // First check if provider has galleryImages directly
  if (provider.galleryImages && provider.galleryImages.length > 0) {
    images = provider.galleryImages;
  } 
  // Otherwise check for images in certification_files
  else if (provider.certification_files) {
    try {
      const filesData = typeof provider.certification_files === 'string'
        ? JSON.parse(provider.certification_files)
        : provider.certification_files;
      
      if (Array.isArray(filesData)) {
        images = filesData
          .filter((file: any) => {
            const fileUrl = file.url || file.downloadUrl || '';
            const fileType = file.type || file.contentType || '';
            return fileType.startsWith('image/') || 
                   fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          })
          .map((file: any) => file.url || file.downloadUrl || '');
      }
    } catch (error) {
      console.error("Error parsing provider certification files:", error);
    }
  }

  // If no images, show a message in place of example images
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

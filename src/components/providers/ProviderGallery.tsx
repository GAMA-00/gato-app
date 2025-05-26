
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronRight, Image } from 'lucide-react';
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
    images = provider.galleryImages.filter(Boolean); // Filter out empty strings
  } 
  // Otherwise check for images in certificationFiles
  else if (provider.certificationFiles) {
    try {
      const filesData = provider.certificationFiles;
      
      if (Array.isArray(filesData)) {
        images = filesData
          .filter((file: any) => {
            const fileUrl = file.url || file.downloadUrl || '';
            const fileType = file.type || file.contentType || '';
            return fileUrl && (fileType.startsWith('image/') || 
                   fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
          })
          .map((file: any) => file.url || file.downloadUrl || '')
          .filter(Boolean); // Filter out empty strings
      }
    } catch (error) {
      console.error("Error parsing provider certification files:", error);
    }
  }

  console.log("ProviderGallery images:", images);

  // If no images, show a message
  if (images.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle>Galería de trabajos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
            <Image className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Este proveedor aún no ha subido imágenes de sus trabajos.</p>
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

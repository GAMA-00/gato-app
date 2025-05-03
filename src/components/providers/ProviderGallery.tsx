
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GalleryHorizontal, ChevronRight } from 'lucide-react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { ProviderProfile } from '@/lib/types';

interface ProviderGalleryProps {
  provider: ProviderProfile;
}

const ProviderGallery = ({ provider }: ProviderGalleryProps) => {
  const [currentImage, setCurrentImage] = useState(0);
  
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
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-luxury-navy">
              Ver galería <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl w-full p-1">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Galería de trabajos</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <img 
                    key={index} 
                    src={image} 
                    alt={`Trabajo ${index + 1}`} 
                    className="w-full h-48 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => setCurrentImage(index)}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {images.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index} className="basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="p-1">
                    <img 
                      src={image} 
                      alt={`Trabajo ${index + 1}`} 
                      className="w-full h-48 object-cover rounded-md"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <GalleryHorizontal className="mx-auto h-12 w-12 opacity-20 mb-2" />
            <p>Este proveedor aún no ha subido imágenes a su galería.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProviderGallery;

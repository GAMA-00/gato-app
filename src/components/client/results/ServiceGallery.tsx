
import React, { useState } from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GalleryHorizontal, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServiceGalleryProps {
  images: string[];
  className?: string;
  showExpandButton?: boolean;
  maxPreview?: number;
}

const ServiceGallery = ({ 
  images, 
  className = '',
  showExpandButton = true,
  maxPreview = 3
}: ServiceGalleryProps) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  // Filter out any undefined or empty strings
  const validImages = images.filter(Boolean);
  
  if (validImages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-muted-foreground ${className}`}>
        <GalleryHorizontal className="h-12 w-12 opacity-20 mb-2" />
        <p>No hay imágenes disponibles para este servicio.</p>
      </div>
    );
  }

  // Limit preview images if needed
  const previewImages = maxPreview ? validImages.slice(0, maxPreview) : validImages;
  const hasMoreImages = validImages.length > previewImages.length;

  return (
    <div className={className}>
      <Carousel className="w-full">
        <CarouselContent>
          {previewImages.map((image, index) => (
            <CarouselItem key={index} className="md:basis-1/2">
              <div className="relative h-64 rounded-md overflow-hidden">
                <img 
                  src={image} 
                  alt={`Imagen de servicio ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // En caso de error, mostrar un mensaje en lugar de una imagen predeterminada
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full bg-muted/30 text-sm text-muted-foreground">Imagen no disponible</div>';
                  }}
                />
                {showExpandButton && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        className="absolute bottom-2 right-2 opacity-80 hover:opacity-100"
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-4">
                      <h3 className="text-lg font-medium mb-4">Galería de imágenes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {validImages.map((img, idx) => (
                          <img 
                            key={idx}
                            src={img}
                            alt={`Imagen completa ${idx + 1}`}
                            className="w-full h-auto rounded-md object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-16 bg-muted/30 text-sm text-muted-foreground">Imagen no disponible</div>';
                            }}
                          />
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CarouselItem>
          ))}
          {hasMoreImages && (
            <CarouselItem className="md:basis-1/2">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="relative h-64 rounded-md overflow-hidden bg-muted/50 flex items-center justify-center cursor-pointer">
                    <div className="text-center">
                      <GalleryHorizontal className="h-8 w-8 mx-auto mb-2 opacity-70" />
                      <p className="font-medium">+{validImages.length - maxPreview} más</p>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full p-4">
                  <h3 className="text-lg font-medium mb-4">Todas las imágenes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validImages.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img}
                        alt={`Imagen completa ${idx + 1}`}
                        className="w-full h-auto rounded-md object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerHTML = '<div class="flex items-center justify-center h-16 bg-muted/30 text-sm text-muted-foreground">Imagen no disponible</div>';
                        }}
                      />
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </CarouselItem>
          )}
        </CarouselContent>
        {previewImages.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default ServiceGallery;

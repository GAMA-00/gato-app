
import React, { useState } from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { GalleryHorizontal, Maximize2, Image } from 'lucide-react';
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
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Filter out any undefined, null, or empty strings and failed images
  const validImages = images?.filter(img => img && !failedImages.has(img)) || [];
  
  console.log("ServiceGallery rendering with images:", validImages);
  console.log("Failed images:", Array.from(failedImages));
  
  const handleImageError = (imageUrl: string) => {
    console.error("Error loading image:", imageUrl);
    setFailedImages(prev => new Set(prev).add(imageUrl));
  };
  
  if (validImages.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-luxury-gray-dark bg-luxury-gray/50 rounded-xl ${className}`}>
        <Image className="h-12 w-12 opacity-20 mb-2" />
        <p className="text-center">No hay imágenes disponibles para este servicio.</p>
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
              <div className="relative h-64 rounded-xl overflow-hidden bg-luxury-gray/20">
                <img 
                  src={image} 
                  alt={`Imagen de servicio ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(image)}
                  onLoad={() => console.log("Image loaded successfully:", image)}
                />
                {showExpandButton && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon"
                        className="absolute bottom-2 right-2 opacity-80 hover:opacity-100 bg-luxury-white/80 backdrop-blur-md"
                        onClick={() => setSelectedImageIndex(index)}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl w-full p-4">
                      <h3 className="text-lg font-medium mb-4 text-luxury-navy">Galería de imágenes</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {validImages.map((img, idx) => (
                          <div key={idx} className="relative bg-luxury-gray/20 rounded-xl overflow-hidden">
                            <img 
                              src={img}
                              alt={`Imagen completa ${idx + 1}`}
                              className="w-full h-auto rounded-xl object-contain"
                              onError={() => handleImageError(img)}
                            />
                          </div>
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
                  <div className="relative h-64 rounded-xl overflow-hidden bg-luxury-gray/30 flex items-center justify-center cursor-pointer hover:bg-luxury-gray/40 transition-colors">
                    <div className="text-center">
                      <GalleryHorizontal className="h-8 w-8 mx-auto mb-2 opacity-70" />
                      <p className="font-medium text-luxury-navy">+{validImages.length - maxPreview} más</p>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full p-4">
                  <h3 className="text-lg font-medium mb-4 text-luxury-navy">Todas las imágenes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validImages.map((img, idx) => (
                      <div key={idx} className="relative bg-luxury-gray/20 rounded-xl overflow-hidden">
                        <img 
                          src={img}
                          alt={`Imagen completa ${idx + 1}`}
                          className="w-full h-auto rounded-xl object-contain"
                          onError={() => handleImageError(img)}
                        />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </CarouselItem>
          )}
        </CarouselContent>
        {previewImages.length > 1 && (
          <>
            <CarouselPrevious className="left-2 bg-luxury-white/80 backdrop-blur-md" />
            <CarouselNext className="right-2 bg-luxury-white/80 backdrop-blur-md" />
          </>
        )}
      </Carousel>
    </div>
  );
};

export default ServiceGallery;

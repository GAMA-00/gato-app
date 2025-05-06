
import React from 'react';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { GalleryHorizontal } from 'lucide-react';

interface ServiceGalleryProps {
  images: string[];
  className?: string;
}

const ServiceGallery = ({ images, className = '' }: ServiceGalleryProps) => {
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

  return (
    <Carousel className={className}>
      <CarouselContent>
        {validImages.map((image, index) => (
          <CarouselItem key={index} className="md:basis-1/2">
            <div className="relative h-64 rounded-md overflow-hidden">
              <img 
                src={image} 
                alt={`Imagen de servicio ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
};

export default ServiceGallery;

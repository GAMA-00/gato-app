
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
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/utils/logger';

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
  const [imageLoadStatus, setImageLoadStatus] = useState<Map<string, 'loading' | 'success' | 'error'>>(new Map());
  
  // Detailed logging of input images
  logger.debug('ServiceGallery input', {
    imagesReceived: images?.length,
    imagesType: typeof images,
    imageDetails: images?.map((img, index) => ({
      index,
      url: img?.substring(0, 50) + '...',
      type: typeof img,
      isEmpty: !img || img.trim() === '',
      startsWithHttp: img?.startsWith('http'),
      isSupabaseUrl: img?.includes('supabase')
    }))
  });
  
  // Filter out any undefined, null, or empty strings and failed images
  const validImages = images?.filter(img => {
    const isValid = img && typeof img === 'string' && img.trim() !== '' && !failedImages.has(img);
    if (!isValid) {
      logger.debug('Filtering out invalid image', { 
        img: img?.substring(0, 50),
        reason: !img ? 'falsy' : typeof img !== 'string' ? 'not string' : img.trim() === '' ? 'empty' : 'in failed set'
      });
    }
    return isValid;
  }) || [];
  
  logger.debug('Valid images after filtering', { count: validImages.length, failedCount: failedImages.size });
  
  const handleImageError = (imageUrl: string, event: any) => {
    logger.error('Image load error', {
      url: imageUrl.substring(0, 100),
      errorType: event?.type,
      naturalWidth: event?.target?.naturalWidth,
      naturalHeight: event?.target?.naturalHeight,
      complete: event?.target?.complete
    });
    
    setFailedImages(prev => new Set(prev).add(imageUrl));
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'error'));
  };
  
  const handleImageLoad = (imageUrl: string, event: any) => {
    logger.debug('Image load success', {
      url: imageUrl.substring(0, 100),
      naturalWidth: event.target.naturalWidth,
      naturalHeight: event.target.naturalHeight
    });
    
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'success'));
  };
  
  const handleImageLoadStart = (imageUrl: string) => {
    logger.debug('Image load start', { url: imageUrl.substring(0, 100) });
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'loading'));
  };
  
  // Test image URLs accessibility
  const testImageUrl = async (url: string) => {
    try {
      logger.debug('Testing image URL accessibility', { url: url.substring(0, 100) });
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      logger.debug('URL test response', {
        url: url.substring(0, 100),
        status: response.status
      });
    } catch (error) {
      logger.warn('URL test failed', { url: url.substring(0, 100), error });
    }
  };
  
  // Test all valid images on component mount
  React.useEffect(() => {
    if (validImages.length > 0) {
      logger.debug('Starting URL accessibility tests', { count: validImages.length });
      validImages.forEach(testImageUrl);
    }
  }, [validImages.length]);
  
  if (validImages.length === 0) {
    logger.info('No valid images to display', { 
      totalImages: images?.length,
      failedImages: failedImages.size
    });
    return (
      <div className={`flex flex-col items-center justify-center py-12 text-luxury-gray-dark bg-luxury-gray/50 rounded-xl ${className}`}>
        <Image className="h-12 w-12 opacity-20 mb-2" />
        <p className="text-center">No hay imágenes disponibles para este servicio.</p>
        {images && images.length > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Se encontraron {images.length} imágenes pero todas fallaron al cargar
          </p>
        )}
      </div>
    );
  }

  // Limit preview images if needed
  const previewImages = maxPreview ? validImages.slice(0, maxPreview) : validImages;
  const hasMoreImages = validImages.length > previewImages.length;
  
  logger.debug('Gallery render info', {
    totalValidImages: validImages.length,
    previewImagesCount: previewImages.length,
    hasMoreImages,
    maxPreview
  });

  return (
    <div className={className}>
      <Carousel className="w-full">
        <CarouselContent>
          {previewImages.map((image, index) => (
            <CarouselItem key={index} className="md:basis-1/2">
              <div className="relative h-64 rounded-xl overflow-hidden bg-luxury-gray/20">
                {imageLoadStatus.get(image) === 'loading' && (
                  <div className="absolute inset-0">
                    <Skeleton className="w-full h-full" />
                  </div>
                )}
                
                <img 
                  src={image} 
                  alt={`Imagen de servicio ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={index === 0 ? 'high' : 'low'}
                  onError={(e) => handleImageError(image, e)}
                  onLoad={(e) => handleImageLoad(image, e)}
                  onLoadStart={() => handleImageLoadStart(image)}
                  style={{
                    display: imageLoadStatus.get(image) === 'error' ? 'none' : 'block'
                  }}
                />
                
                {imageLoadStatus.get(image) === 'error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                    <Image className="h-8 w-8 opacity-50 mb-2" />
                    <p className="text-xs text-center px-2">Error al cargar imagen</p>
                    <p className="text-xs text-center px-2 mt-1 break-all">{image.substring(0, 50)}...</p>
                  </div>
                )}
                
                {showExpandButton && imageLoadStatus.get(image) === 'success' && (
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
                              loading="lazy"
                              decoding="async"
                              onError={(e) => handleImageError(img, e)}
                              onLoad={(e) => handleImageLoad(img, e)}
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
                          loading="lazy"
                          decoding="async"
                          onError={(e) => handleImageError(img, e)}
                          onLoad={(e) => handleImageLoad(img, e)}
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

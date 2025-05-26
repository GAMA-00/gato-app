
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
  const [imageLoadStatus, setImageLoadStatus] = useState<Map<string, 'loading' | 'success' | 'error'>>(new Map());
  
  // Detailed logging of input images
  console.log("=== SERVICE GALLERY DEBUG ===");
  console.log("Raw images received:", images);
  console.log("Images type:", typeof images);
  console.log("Images length:", images?.length);
  console.log("Images array details:", images?.map((img, index) => ({
    index,
    url: img,
    type: typeof img,
    length: img?.length,
    isEmpty: !img || img.trim() === '',
    startsWithHttp: img?.startsWith('http'),
    isSupabaseUrl: img?.includes('supabase')
  })));
  
  // Filter out any undefined, null, or empty strings and failed images
  const validImages = images?.filter(img => {
    const isValid = img && typeof img === 'string' && img.trim() !== '' && !failedImages.has(img);
    if (!isValid) {
      console.log("❌ Filtering out invalid image:", { 
        img, 
        reason: !img ? 'falsy' : typeof img !== 'string' ? 'not string' : img.trim() === '' ? 'empty' : 'in failed set'
      });
    }
    return isValid;
  }) || [];
  
  console.log("✅ Valid images after filtering:", validImages);
  console.log("Failed images set:", Array.from(failedImages));
  console.log("Image load status map:", Object.fromEntries(imageLoadStatus));
  
  const handleImageError = (imageUrl: string, event: any) => {
    console.error("❌ IMAGE LOAD ERROR:");
    console.error("URL:", imageUrl);
    console.error("Error event:", event);
    console.error("Error type:", event?.type);
    console.error("Error target:", event?.target);
    
    // Try to get more details about the error
    if (event?.target) {
      console.error("Image naturalWidth:", event.target.naturalWidth);
      console.error("Image naturalHeight:", event.target.naturalHeight);
      console.error("Image complete:", event.target.complete);
      console.error("Image src:", event.target.src);
    }
    
    setFailedImages(prev => new Set(prev).add(imageUrl));
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'error'));
  };
  
  const handleImageLoad = (imageUrl: string, event: any) => {
    console.log("✅ IMAGE LOAD SUCCESS:");
    console.log("URL:", imageUrl);
    console.log("Image dimensions:", {
      naturalWidth: event.target.naturalWidth,
      naturalHeight: event.target.naturalHeight,
      displayWidth: event.target.width,
      displayHeight: event.target.height
    });
    
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'success'));
  };
  
  const handleImageLoadStart = (imageUrl: string) => {
    console.log("🔄 IMAGE LOAD START:", imageUrl);
    setImageLoadStatus(prev => new Map(prev).set(imageUrl, 'loading'));
  };
  
  // Test image URLs accessibility
  const testImageUrl = async (url: string) => {
    try {
      console.log("🧪 Testing image URL accessibility:", url);
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      console.log("🧪 URL test response:", {
        url,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    } catch (error) {
      console.error("🧪 URL test failed:", url, error);
    }
  };
  
  // Test all valid images on component mount
  React.useEffect(() => {
    if (validImages.length > 0) {
      console.log("🧪 Starting URL accessibility tests...");
      validImages.forEach(testImageUrl);
    }
  }, [validImages.length]);
  
  if (validImages.length === 0) {
    console.log("📭 No valid images to display");
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
  
  console.log("🖼️ Gallery render info:", {
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
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                )}
                
                <img 
                  src={image} 
                  alt={`Imagen de servicio ${index + 1}`}
                  className="w-full h-full object-cover"
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

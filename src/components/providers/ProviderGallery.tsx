import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Image } from 'lucide-react';
import { ProviderProfile } from '@/lib/types';
import ServiceGallery from '@/components/client/results/ServiceGallery';

interface ProviderGalleryProps {
  provider: ProviderProfile;
}

const ProviderGallery = ({ provider }: ProviderGalleryProps) => {
  console.log("=== PROVIDER GALLERY DEBUG ===");
  console.log("Provider data:", provider);
  console.log("Provider galleryImages:", provider.galleryImages);
  console.log("Provider certificationFiles:", provider.certificationFiles);
  
  // Use gallery images if available
  let images: string[] = [];
  
  // First check if provider has galleryImages directly
  if (provider.galleryImages && provider.galleryImages.length > 0) {
    console.log("✅ Using provider.galleryImages");
    images = provider.galleryImages.filter(Boolean); // Filter out empty strings
    console.log("Filtered galleryImages:", images);
  } 
  // Otherwise check for images in certificationFiles
  else if (provider.certificationFiles) {
    console.log("🔄 Checking certificationFiles for images");
    try {
      const filesData = provider.certificationFiles;
      console.log("CertificationFiles data:", filesData);
      
      if (Array.isArray(filesData)) {
        images = filesData
          .filter((file: any) => {
            const fileUrl = file.url || file.downloadUrl || '';
            const fileType = file.type || file.contentType || '';
            const isImage = fileUrl && (fileType.startsWith('image/') || 
                   fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i));
            
            console.log("File analysis:", {
              file,
              fileUrl,
              fileType,
              isImage
            });
            
            return isImage;
          })
          .map((file: any) => file.url || file.downloadUrl || '')
          .filter(Boolean); // Filter out empty strings
          
        console.log("Images extracted from certificationFiles:", images);
      }
    } catch (error) {
      console.error("❌ Error parsing provider certification files:", error);
    }
  }

  console.log("🖼️ Final images array for ProviderGallery:", images);
  console.log("Images count:", images.length);
  console.log("Images details:", images.map((img, index) => ({
    index,
    url: img,
    isValid: !!img && typeof img === 'string' && img.trim() !== ''
  })));

  // If no images, show a message
  if (images.length === 0) {
    console.log("📭 No images found, showing empty state");
    return (
      <Card>
        <CardHeader className="pb-3">
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
      <CardHeader className="pb-3">
        <CardTitle>Galería de trabajos</CardTitle>
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

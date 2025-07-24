
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface EnhancedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
  onError?: () => void;
  onLoad?: () => void;
}

const EnhancedAvatar = ({ 
  src, 
  alt = '', 
  fallback, 
  className, 
  onError, 
  onLoad 
}: EnhancedAvatarProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  // Reset states when src changes
  useEffect(() => {
    if (src && src !== currentSrc) {
      setImageError(false);
      setImageLoaded(false);
      setCurrentSrc(src);
    } else if (!src) {
      setImageError(false);
      setImageLoaded(false);
      setCurrentSrc(null);
    }
  }, [src, currentSrc]);

  const handleImageError = () => {
    console.error('Enhanced Avatar: Failed to load image:', { src: currentSrc, alt, imageError });
    
    // Try with different extension if this is a supabase storage URL
    if (currentSrc && currentSrc.includes('supabase.co/storage') && !imageError) {
      const alternativeUrl = currentSrc.includes('.jpg') 
        ? currentSrc.replace('.jpg', '.png')
        : currentSrc.replace('.png', '.jpg');
      
      console.log('Enhanced Avatar: Trying alternative URL:', alternativeUrl);
      setCurrentSrc(alternativeUrl);
      return;
    }
    
    // Try adding cache busting parameter to force reload
    if (currentSrc && !currentSrc.includes('?t=') && !imageError) {
      const cacheBustUrl = `${currentSrc}?t=${Date.now()}`;
      console.log('Enhanced Avatar: Trying cache-busted URL:', cacheBustUrl);
      setCurrentSrc(cacheBustUrl);
      return;
    }
    
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    console.log('Enhanced Avatar: Image loaded successfully:', { src: currentSrc, alt });
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  };

  // Check if we have a valid image URL
  const hasValidSrc = currentSrc && typeof currentSrc === 'string' && currentSrc.trim() !== '';
  const shouldShowImage = hasValidSrc && !imageError;

  console.log('Enhanced Avatar: Render state:', { 
    originalSrc: src, 
    currentSrc, 
    hasValidSrc, 
    shouldShowImage, 
    imageError, 
    imageLoaded,
    alt,
    fallback 
  });

  return (
    <Avatar className={cn("relative", className)}>
      {shouldShowImage && (
        <AvatarImage 
          src={currentSrc} 
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="object-cover"
        />
      )}
      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
        {fallback || (alt ? alt.substring(0, 2).toUpperCase() : '??')}
      </AvatarFallback>
    </Avatar>
  );
};

export default EnhancedAvatar;

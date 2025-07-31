
import React, { useState } from 'react';
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

  const handleImageError = () => {
    console.error('EnhancedAvatar: Image load failed for:', src);
    console.error('EnhancedAvatar: Error details:', { src, alt, className });
    setImageError(true);
    onError?.();
    
    // Retry with cache busting if not already present
    if (src && !src.includes('?t=')) {
      const timestamp = new Date().getTime();
      const retryUrl = `${src}?t=${timestamp}`;
      console.log('EnhancedAvatar: Retrying with cache busting:', retryUrl);
      setTimeout(() => {
        const img = document.createElement('img');
        img.onload = () => {
          console.log('EnhancedAvatar: Retry successful, forcing component update');
          setImageError(false);
        };
        img.onerror = () => console.error('EnhancedAvatar: Retry also failed');
        img.src = retryUrl;
      }, 1000);
    }
  };

  const handleImageLoad = () => {
    console.log('EnhancedAvatar: Image loaded successfully:', src);
    setImageError(false);
    onLoad?.();
  };

  // Check if we have a valid image URL
  const hasValidSrc = src && typeof src === 'string' && src.trim() !== '';
  const shouldShowImage = hasValidSrc && !imageError;

  return (
    <Avatar className={cn("relative", className)}>
      {shouldShowImage && (
        <AvatarImage 
          src={src} 
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

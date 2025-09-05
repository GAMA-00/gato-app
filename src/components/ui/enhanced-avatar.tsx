
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Reset states when src changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
  }, [src]);

  const handleImageError = () => {
    console.error('EnhancedAvatar: Image load failed for:', src);
    console.error('EnhancedAvatar: Error details:', { src, alt, className, retryCount });
    setImageError(true);
    onError?.();
    
    // Retry with cache busting if not already attempted
    if (src && retryCount < 2) {
      const timestamp = new Date().getTime();
      const retryUrl = `${src}${src.includes('?') ? '&' : '?'}t=${timestamp}`;
      console.log('EnhancedAvatar: Retrying with cache busting:', retryUrl);
      
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageError(false);
        
        // Test the URL directly
        const img = document.createElement('img');
        img.onload = () => {
          console.log('EnhancedAvatar: Retry successful for:', retryUrl);
          setImageLoaded(true);
        };
        img.onerror = () => {
          console.error('EnhancedAvatar: Retry also failed for:', retryUrl);
          setImageError(true);
        };
        img.src = retryUrl;
      }, 500);
    }
  };

  const handleImageLoad = () => {
    console.log('EnhancedAvatar: Image loaded successfully:', src);
    setImageError(false);
    setImageLoaded(true);
    onLoad?.();
  };

  // Check if we have a valid image URL
  const hasValidSrc = src && typeof src === 'string' && src.trim() !== '';
  const shouldShowImage = hasValidSrc && !imageError;
  
  // Add cache busting to the URL if we have retries
  const finalSrc = retryCount > 0 && src ? `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}` : src;

  return (
    <Avatar className={cn("relative", className)}>
      {shouldShowImage && (
        <AvatarImage 
          src={finalSrc} 
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          className="object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      )}
      <AvatarFallback className={cn(
        "bg-primary text-primary-foreground font-semibold",
        imageLoaded ? "opacity-0" : "opacity-100"
      )}>
        {fallback || (alt ? alt.substring(0, 2).toUpperCase() : '??')}
      </AvatarFallback>
    </Avatar>
  );
};

export default EnhancedAvatar;

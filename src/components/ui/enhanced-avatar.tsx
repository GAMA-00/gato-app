
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
    console.log('Avatar load failed for:', src);
    setImageError(true);
    onError?.();
  };

  const handleImageLoad = () => {
    console.log('Avatar loaded successfully:', src);
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

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  aspectRatio?: string;
  fallback?: React.ReactNode;
  className?: string;
  priority?: boolean;
  blurDataURL?: string;
}

export const OptimizedImage = ({
  src,
  alt,
  aspectRatio = '16/9',
  fallback,
  className,
  priority = false,
  blurDataURL,
  ...props
}: OptimizedImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  if (error && fallback) {
    return <>{fallback}</>;
  }

  return (
    <div 
      className={cn("relative overflow-hidden", className)}
      style={{ aspectRatio }}
    >
      {/* Blur placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0">
          {blurDataURL ? (
            <img
              src={blurDataURL}
              alt=""
              className="w-full h-full object-cover blur-sm scale-110"
              aria-hidden="true"
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      )}

      {/* Main image */}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </div>
  );
};

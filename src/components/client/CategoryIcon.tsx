
import React, { useState, useEffect } from 'react';
import { Book, LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { iconMap, categoryLabels, categoryImageUrls } from '@/constants/categoryConstants';
import { useImageCache } from '@/hooks/useImageCache';

interface CategoryIconProps {
  categoryName: string;
  isMobile: boolean;
  isVisible: boolean;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryName, isMobile, isVisible }) => {
  const [imageError, setImageError] = useState(false);
  const [directImageLoaded, setDirectImageLoaded] = useState(false);
  const [showDirectImage, setShowDirectImage] = useState(false);
  
  const iconComponent = iconMap[categoryName] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  // Preload crítico inmediato para las primeras 4 categorías
  const isCritical = ['home', 'pets', 'classes', 'personal-care'].includes(categoryName);
  
  const { cachedUrl, isLoading, error } = useImageCache(imageUrl, {
    priority: isCritical ? 'critical' : 'high',
    preloadOnMount: true,
    timeout: 3000 // Increased timeout for better loading
  });
  
  // Handle image errors and loading states
  useEffect(() => {
    if (error) {
      console.warn(`Cache error for ${categoryName}:`, error);
      // Don't immediately set imageError, let direct image try first
      setShowDirectImage(true);
    }
  }, [error, categoryName]);

  // Show direct image if cache fails or takes too long
  useEffect(() => {
    if (!cachedUrl && isLoading) {
      const timer = setTimeout(() => {
        setShowDirectImage(true);
      }, 1500); // Show direct image after 1.5s if cache is still loading
      
      return () => clearTimeout(timer);
    }
  }, [cachedUrl, isLoading]);
  
  if (!imageUrl) {
    // Fallback a Lucide icon solo si no hay URL de imagen
    return React.createElement(iconComponent as LucideIcon, {
      size: isMobile ? 54 : 72,
      strokeWidth: isMobile ? 2 : 1.8,
      className: "text-[#1A1A1A]"
    });
  }
  
  return (
    <div className="relative">
      {/* Mostrar skeleton solo si no hay imagen cacheada, no se cargó directamente, y está cargando */}
      {!cachedUrl && !directImageLoaded && isLoading && !showDirectImage && (
        <Skeleton className={cn(
          "absolute inset-0 rounded",
          isMobile ? "w-20 h-20" : "w-24 h-24"
        )} />
      )}
      
      {/* Imagen desde cache */}
      {cachedUrl && !imageError && (
        <img 
          src={cachedUrl}
          alt={categoryLabels[categoryName] || categoryName}
          className={cn(
            "object-contain transition-opacity duration-200",
            isMobile ? "w-20 h-20" : "w-24 h-24",
            "opacity-100"
          )}
          loading={isCritical ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            console.warn(`Cached image failed for ${categoryName}`);
            setImageError(true);
            setShowDirectImage(true);
          }}
          style={{
            imageRendering: 'crisp-edges'
          }}
        />
      )}
      
      {/* Imagen directa como fallback o carga alternativa */}
      {(showDirectImage || (!cachedUrl && !isLoading)) && !imageError && (
        <img 
          src={imageUrl}
          alt={categoryLabels[categoryName] || categoryName}
          className={cn(
            "object-contain transition-opacity duration-200",
            isMobile ? "w-20 h-20" : "w-24 h-24",
            directImageLoaded ? "opacity-100" : "opacity-0"
          )}
          loading={isCritical ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => {
            setDirectImageLoaded(true);
            setImageError(false);
          }}
          onError={() => {
            console.error(`Direct image load failed for ${categoryName}:`, imageUrl);
            setImageError(true);
          }}
          style={{
            imageRendering: 'crisp-edges'
          }}
        />
      )}
      
      {/* Fallback final a icono Lucide solo si ambas cargas fallan */}
      {imageError && !cachedUrl && !directImageLoaded && (
        React.createElement(iconComponent as LucideIcon, {
          size: isMobile ? 54 : 72,
          strokeWidth: isMobile ? 2 : 1.8,
          className: "text-[#1A1A1A]"
        })
      )}
    </div>
  );
};

export default CategoryIcon;

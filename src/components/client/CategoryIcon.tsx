
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
  
  const iconComponent = iconMap[categoryName] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  // Preload crítico inmediato para las primeras 4 categorías
  const isCritical = ['home', 'pets', 'classes', 'personal-care'].includes(categoryName);
  
  const { cachedUrl, isLoading, error } = useImageCache(imageUrl, {
    priority: isCritical ? 'critical' : 'high',
    preloadOnMount: true, // Siempre precargar, no esperar visibilidad
    timeout: 500 // Timeout para fallback rápido
  });
  
  // Handle image errors
  useEffect(() => {
    if (error) {
      setImageError(true);
    }
  }, [error]);
  
  if (!imageUrl || imageError) {
    // Fallback a Lucide icon
    return React.createElement(iconComponent as LucideIcon, {
      size: isMobile ? 54 : 72,
      strokeWidth: isMobile ? 2 : 1.8,
      className: "text-[#1A1A1A]"
    });
  }
  
  return (
    <div className="relative">
      {/* Mostrar skeleton solo si no hay imagen cacheada Y está cargando */}
      {!cachedUrl && !directImageLoaded && isLoading && (
        <Skeleton className={cn(
          "absolute inset-0 rounded",
          isMobile ? "w-20 h-20" : "w-24 h-24"
        )} />
      )}
      
      {/* Imagen principal - siempre renderizada */}
      <img 
        src={cachedUrl || imageUrl}
        alt={categoryLabels[categoryName] || categoryName}
        className={cn(
          "object-contain transition-opacity duration-200",
          isMobile ? "w-20 h-20" : "w-24 h-24",
          (cachedUrl || directImageLoaded) ? "opacity-100" : "opacity-0"
        )}
        loading={isCritical ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setDirectImageLoaded(true)}
        onError={() => setImageError(true)}
        style={{
          imageRendering: 'crisp-edges'
        }}
      />
    </div>
  );
};

export default CategoryIcon;


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
  
  const iconComponent = iconMap[categoryName] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  // Use the new image cache hook
  const { cachedUrl, isLoading, error } = useImageCache(imageUrl, {
    priority: 'critical',
    preloadOnMount: isVisible
  });
  
  // Handle image errors
  useEffect(() => {
    if (error) {
      setImageError(true);
    }
  }, [error]);
  
  if (!imageUrl || imageError) {
    // Fallback to Lucide icon
    return React.createElement(iconComponent as LucideIcon, {
      size: isMobile ? 54 : 72,
      strokeWidth: isMobile ? 2 : 1.8,
      className: "text-[#1A1A1A]"
    });
  }
  
  return (
    <div className="relative">
      {isLoading && (
        <Skeleton className={cn(
          "absolute inset-0 rounded",
          isMobile ? "w-20 h-20" : "w-24 h-24"
        )} />
      )}
      <img 
        src={cachedUrl || imageUrl}
        alt={categoryLabels[categoryName] || categoryName}
        className={cn(
          "object-contain transition-opacity duration-200",
          isMobile ? "w-20 h-20" : "w-24 h-24",
          cachedUrl && !isLoading ? "opacity-100" : "opacity-0"
        )}
        loading={isVisible ? "eager" : "lazy"}
        decoding="async"
        onError={() => setImageError(true)}
        style={{
          imageRendering: 'crisp-edges',
          willChange: isLoading ? 'opacity' : 'auto'
        }}
      />
    </div>
  );
};

export default CategoryIcon;

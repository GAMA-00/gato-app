
import React, { useState } from 'react';
import { Book, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconMap, categoryLabels, categoryImageUrls } from '@/constants/categoryConstants';

interface CategoryIconProps {
  categoryName: string;
  isMobile: boolean;
  isVisible: boolean;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryName, isMobile, isVisible }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const iconComponent = iconMap[categoryName] || Book;
  const imageUrl = categoryImageUrls[categoryName];
  
  // Si no hay URL de imagen o la imagen falló, mostrar icono Lucide
  if (!imageUrl || imageError) {
    return React.createElement(iconComponent as LucideIcon, {
      size: isMobile ? 54 : 72,
      strokeWidth: isMobile ? 2 : 1.8,
      className: "text-[#1A1A1A]"
    });
  }
  
  return (
    <div className="relative">
      <img 
        src={imageUrl}
        alt={categoryLabels[categoryName] || categoryName}
        className={cn(
          "object-contain transition-opacity duration-300",
          isMobile ? "w-20 h-20" : "w-24 h-24",
          imageLoaded ? "opacity-100" : "opacity-0"
        )}
        loading="eager"
        decoding="async"
        onLoad={() => {
          setImageLoaded(true);
        }}
        onError={() => {
          console.warn(`Image failed to load for ${categoryName}:`, imageUrl);
          setImageError(true);
        }}
        style={{
          imageRendering: 'crisp-edges'
        }}
      />
      
      {/* Mostrar icono de respaldo mientras carga la imagen */}
      {!imageLoaded && !imageError && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center",
          isMobile ? "w-20 h-20" : "w-24 h-24"
        )}>
          {React.createElement(iconComponent as LucideIcon, {
            size: isMobile ? 54 : 72,
            strokeWidth: isMobile ? 2 : 1.8,
            className: "text-[#1A1A1A] opacity-30"
          })}
        </div>
      )}
    </div>
  );
};

export default CategoryIcon;

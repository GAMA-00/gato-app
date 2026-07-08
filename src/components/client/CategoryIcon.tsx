
import React from 'react';
import { cn } from '@/lib/utils';
import { categoryImages } from '@/constants/categoryConstants';

interface CategoryIconProps {
  categoryName: string;
  isMobile: boolean;
  isVisible: boolean;
  className?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({ categoryName, isMobile, isVisible, className }) => {
  const imageUrl = categoryImages[categoryName];
  
  if (!imageUrl) return null;
  
  return (
    <img 
      src={imageUrl}
      alt=""
      className={cn(
        "object-contain",
        isMobile ? "w-20 h-20" : "w-24 h-24",
        className
      )}
      loading="eager"
      decoding="async"
    />
  );
};

export default CategoryIcon;

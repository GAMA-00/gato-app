import React from 'react';
import { cn } from '@/lib/utils';
import { categoryGradients, categoryTextColors } from '@/constants/categoryColors';
import { categoryImages } from '@/constants/categoryConstants';
import CategoryPillNav from './CategoryPillNav';

interface CategoryHeroHeaderProps {
  categoryId: string;
  categoryLabel: string;
  allCategories: Array<{ id: string; name: string; label: string }>;
}

const CategoryHeroHeader = ({ categoryId, categoryLabel, allCategories }: CategoryHeroHeaderProps) => {
  const gradient = categoryGradients[categoryId] || categoryGradients['other'];
  const textColor = categoryTextColors[categoryId] || categoryTextColors['other'];
  const imageUrl = categoryImages[categoryId];

  return (
    <div className={cn(
      "relative bg-gradient-to-br pt-20 pb-4 px-4 overflow-hidden",
      gradient
    )}>
      {/* Category title and icon */}
      <div className="flex items-center justify-between mb-4">
        <h1 className={cn("text-2xl font-bold", textColor)}>
          {categoryLabel}
        </h1>
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="w-16 h-16 object-contain"
            loading="eager"
          />
        )}
      </div>

      {/* Category pills navigation */}
      <CategoryPillNav 
        currentCategory={categoryId} 
        categories={allCategories} 
      />
    </div>
  );
};

export default CategoryHeroHeader;

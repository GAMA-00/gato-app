import React from 'react';
import { cn } from '@/lib/utils';
import { categoryGradients, categoryTextColors } from '@/constants/categoryColors';
import CategoryIcon from './CategoryIcon';
import CategoryPillNav from './CategoryPillNav';

interface CategoryHeroHeaderProps {
  categoryId: string;
  categoryLabel: string;
  allCategories: Array<{ id: string; name: string; label: string }>;
}

const CategoryHeroHeader = ({ categoryId, categoryLabel, allCategories }: CategoryHeroHeaderProps) => {
  const gradient = categoryGradients[categoryId] || categoryGradients['other'];
  const textColor = categoryTextColors[categoryId] || categoryTextColors['other'];

  return (
    <div className={cn(
      "relative bg-gradient-to-br pt-20 pb-4 px-4",
      gradient
    )}>
      {/* Category title and icon */}
      <div className="flex items-center justify-between mb-4">
        <h1 className={cn("text-2xl font-bold", textColor)}>
          {categoryLabel}
        </h1>
        <div className="w-16 h-16">
          <CategoryIcon 
            categoryName={categoryId} 
            isMobile={true} 
            isVisible={true} 
          />
        </div>
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

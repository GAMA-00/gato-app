import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { categoryLabels } from '@/constants/categoryConstants';

interface CategoryPillNavProps {
  currentCategory: string;
  categories: Array<{ id: string; name: string; label: string }>;
}

const CategoryPillNav = ({ currentCategory, categories }: CategoryPillNavProps) => {
  const navigate = useNavigate();

  const handleCategoryClick = (categoryName: string) => {
    if (categoryName !== currentCategory) {
      navigate(`/client/category/${categoryName}`);
    }
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {categories.map((category) => {
        const isActive = category.name === currentCategory;
        const label = categoryLabels[category.name] || category.label;
        
        return (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.name)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap",
              isActive
                ? "bg-primary text-primary-foreground"
                : "bg-white/80 text-foreground hover:bg-white"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default CategoryPillNav;

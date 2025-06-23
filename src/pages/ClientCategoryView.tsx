
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import CategoryIcon from '@/components/client/CategoryIcon';
import { useCategoryPreload } from '@/hooks/useCategoryPreload';
import { useCategoryVisibility } from '@/hooks/useCategoryVisibility';
import { categoryOrder, categoryLabels } from '@/constants/categoryConstants';
import { smartPreloader } from '@/utils/smartPreloader';

const ClientCategoryView = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Use enhanced preloading
  useCategoryPreload();
  const { visibleItems } = useCategoryVisibility();

  const { data: fetchedCategories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
        
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Organize categories in the desired order
  const categories = [...fetchedCategories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.name);
    const indexB = categoryOrder.indexOf(b.name);
    return indexA - indexB;
  });

  const handleCategoryClick = (categoryName: string) => {
    // Preload services for this category
    smartPreloader.preloadCategoryServices(categoryName);
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={cn(
          isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
          "min-h-screen w-full bg-white"
        )}>
          <div className={cn(
            "w-full h-full flex flex-col justify-start items-center",
            isMobile ? "px-6 pt-4 pb-20" : "p-6"
          )}>
            <div className={cn(
              "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto",
              isMobile ? "px-6 w-full" : "px-2 md:px-6"
            )}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={cn(
                  isMobile ? "h-36 rounded-xl" : "h-32 md:h-40 rounded-xl"
                )} />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  const textSizeClass = isMobile ? 'text-base font-semibold' : 'text-lg';
  
  return (
    <>
      <Navbar />
      <div className={cn(
        isMobile ? "pt-0 pb-0" : "pl-56 pt-4",
        "min-h-screen w-full bg-white"
      )}>
        <div className={cn(
          "w-full h-full flex flex-col justify-start items-center",
          isMobile ? "px-6 pt-4 pb-20" : "p-6"
        )}>
          <div className={cn(
            "max-w-7xl w-full animate-fade-in",
            "flex flex-col items-center justify-start"
          )}>
            <div className={cn(
              "flex flex-col justify-center gap-1 w-full",
              isMobile ? "mb-6" : "mb-4"
            )}>
              <div className="w-full flex justify-center">
                <h1 className={cn(
                  "font-bold tracking-tight text-app-text text-center",
                  isMobile ? "text-2xl mb-0" : "text-2xl md:text-3xl mb-0"
                )}>
                  Explora nuestras categorías de servicio
                </h1>
              </div>
            </div>
            
            <div className={cn(
              "animate-slide-up flex justify-center w-full flex-1 items-start",
              isMobile ? "mt-0" : "mt-4"
            )}>
              <div className="w-full flex justify-center">
                <div className={cn(
                  "grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto",
                  isMobile ? "w-full" : "px-2 md:px-6"
                )}>
                  {categoryOrder.map((categoryName) => {
                    const category = categories.find(c => c.name === categoryName);
                    if (!category) return null;
                    
                    const isVisible = visibleItems.has(categoryName);
                    
                    return (
                      <div 
                        key={category.id} 
                        onClick={() => handleCategoryClick(category.name)}
                        data-category={categoryName}
                      >
                        <Card className={cn(
                          "flex flex-col items-center justify-center hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group",
                          isMobile ? "p-6 h-36 rounded-xl" : "p-8 h-48"
                        )}>
                          <div className={cn(
                            "flex items-center justify-center",
                            isMobile ? "mb-3" : "mb-4"
                          )}>
                            <CategoryIcon 
                              categoryName={categoryName}
                              isMobile={isMobile}
                              isVisible={isVisible}
                            />
                          </div>
                          <h3 className={cn(
                            "text-center text-[#1A1A1A] overflow-wrap-anywhere hyphens-auto",
                            textSizeClass,
                            isMobile ? "px-2" : "px-2"
                          )}>
                            {categoryLabels[category.name] || category.label}
                          </h3>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ClientCategoryView;

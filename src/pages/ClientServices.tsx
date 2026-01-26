import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import CategoryIcon from '@/components/client/CategoryIcon';
import { useCategoryVisibility } from '@/hooks/useCategoryVisibility';
import { categoryOrder, categoryLabels } from '@/constants/categoryConstants';
import { smartPreloader } from '@/utils/smartPreloader';
import LocationHeader from '@/components/client/LocationHeader';
import RecommendedServicesCarousel from '@/components/client/RecommendedServicesCarousel';
import { useRecommendedListings } from '@/hooks/useRecommendedListings';

const ClientServices = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Use visibility tracking for intersection observer
  const { visibleItems } = useCategoryVisibility();
  
  // Fetch recommended listings for mobile carousel
  const { data: recommendedListings = [], isLoading: recommendedLoading } = useRecommendedListings();

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
      <ClientPageLayout>
        <div className="space-y-6">
          {isMobile && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-6 w-40" />
            </div>
          )}
          <div>
            {isMobile && <Skeleton className="h-6 w-24 mb-4" />}
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-3 gap-3" : "grid-cols-2 md:grid-cols-3 gap-4 md:gap-8"
            )}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className={cn(
                  "rounded-xl",
                  isMobile ? "h-28" : "h-32 md:h-40"
                )} />
              ))}
            </div>
          </div>
        </div>
      </ClientPageLayout>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <ClientPageLayout>
        <div className="space-y-6">
          {/* 1. Location Header */}
          <LocationHeader />
          
          {/* 2. Categories Section */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Categorías</h2>
            <div className="grid grid-cols-3 gap-3">
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
                    <Card className="flex flex-col items-center justify-center p-3 h-28 rounded-xl hover:shadow-md transition-all cursor-pointer bg-[#F2F2F2] group">
                      <div className="flex items-center justify-center mb-1">
                        <CategoryIcon 
                          categoryName={categoryName}
                          isMobile={true}
                          isVisible={isVisible}
                        />
                      </div>
                      <h3 className="text-center text-[#1A1A1A] text-sm font-medium overflow-wrap-anywhere hyphens-auto px-1 leading-tight">
                        {categoryLabels[category.name] || category.label}
                      </h3>
                    </Card>
                  </div>
                );
              })}
            </div>
          </section>
          
          {/* 3. Recommended Services Section */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">Servicios recomendados</h2>
            <RecommendedServicesCarousel 
              listings={recommendedListings} 
              isLoading={recommendedLoading}
            />
          </section>
        </div>
      </ClientPageLayout>
    );
  }

  // Desktop layout
  const textSizeClass = 'text-lg';
  
  return (
    <ClientPageLayout title="Explora nuestras categorías de servicio">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-2 md:px-6">
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
              <Card className="flex flex-col items-center justify-center p-8 h-48 hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group">
                <div className="flex items-center justify-center mb-4">
                  <CategoryIcon 
                    categoryName={categoryName}
                    isMobile={false}
                    isVisible={isVisible}
                  />
                </div>
                <h3 className={cn(
                  "text-center text-[#1A1A1A] overflow-wrap-anywhere hyphens-auto px-2",
                  textSizeClass
                )}>
                  {categoryLabels[category.name] || category.label}
                </h3>
              </Card>
            </div>
          );
        })}
      </div>
      
      {/* Servicios Recomendados para Desktop */}
      <section className="mt-8 px-2 md:px-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Servicios recomendados
        </h2>
        <RecommendedServicesCarousel 
          listings={recommendedListings} 
          isLoading={recommendedLoading}
        />
      </section>
    </ClientPageLayout>
  );
};

export default ClientServices;

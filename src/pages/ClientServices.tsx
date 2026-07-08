import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { useCategoryVisibility } from '@/hooks/useCategoryVisibility';
import { categoryOrder, categoryLabels, categoryImages } from '@/constants/categoryConstants';
import { categoryCardBgColors, categoryTextColors } from '@/constants/categoryColors';
import { smartPreloader } from '@/utils/smartPreloader';
import LocationHeader from '@/components/client/LocationHeader';
import RecommendedServicesCarousel from '@/components/client/RecommendedServicesCarousel';
import { useRecommendedListings } from '@/hooks/useRecommendedListings';

const ClientServices = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { visibleItems } = useCategoryVisibility();
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

  const categories = [...fetchedCategories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.name);
    const indexB = categoryOrder.indexOf(b.name);
    return indexA - indexB;
  });

  const handleCategoryClick = (categoryName: string) => {
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

  const renderCategoryCard = (categoryName: string, category: any) => {
    const bgColor = categoryCardBgColors[categoryName] || 'bg-muted';
    const textColor = categoryTextColors[categoryName] || 'text-foreground';
    const imageUrl = categoryImages[categoryName];

    return (
      <div
        key={category.id}
        onClick={() => handleCategoryClick(category.name)}
        data-category={categoryName}
        className="cursor-pointer"
      >
        <div className={cn(
          "relative overflow-hidden rounded-2xl shadow-sm hover:shadow-md transition-shadow",
          bgColor,
          isMobile ? "h-28" : "h-40"
        )}>
          {/* Text top-left */}
          <span className={cn(
            "absolute top-3 left-3 font-bold z-10",
            textColor,
            isMobile ? "text-xs" : "text-base"
          )}>
            {categoryLabels[category.name] || category.label}
          </span>

          {/* Icon bottom-right, partially cropped */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className={cn(
                "absolute bottom-0 right-0 object-contain pointer-events-none",
                isMobile
                  ? "w-20 h-20 translate-x-2 translate-y-2"
                  : "w-28 h-28 translate-x-3 translate-y-3"
              )}
              loading="eager"
              decoding="async"
            />
          )}
        </div>
      </div>
    );
  };

  // Mobile layout
  if (isMobile) {
    return (
      <ClientPageLayout>
        <div className="space-y-4">
          <LocationHeader />
          
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">Categorías</h2>
            <div className="grid grid-cols-3 gap-3">
              {categoryOrder.map((categoryName) => {
                const category = categories.find(c => c.name === categoryName);
                if (!category) return null;
                return renderCategoryCard(categoryName, category);
              })}
            </div>
          </section>
          
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
  return (
    <ClientPageLayout title="Explora nuestras categorías de servicio">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-2 md:px-6">
        {categoryOrder.map((categoryName) => {
          const category = categories.find(c => c.name === categoryName);
          if (!category) return null;
          return renderCategoryCard(categoryName, category);
        })}
      </div>
      
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

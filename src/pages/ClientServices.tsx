
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import CategoryIcon from '@/components/client/CategoryIcon';
import { categoryLabels, categoryOrder } from '@/constants/categoryConstants';
import { useCategoryPreload } from '@/hooks/useCategoryPreload';

const ClientServices = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Preload critical category images
  useCategoryPreload();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
        
      if (error) throw error;
      return data;
    },
  });

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  // Sort categories according to our custom order
  const sortedCategories = categories.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.name);
    const bIndex = categoryOrder.indexOf(b.name);
    return aIndex - bIndex;
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Servicios" subtitle="Cargando categorías...">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer title="Servicios" subtitle="Selecciona una categoría">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
          {sortedCategories.map((category, index) => (
            <Card 
              key={category.id} 
              onClick={() => handleCategoryClick(category.name)}
              className="flex flex-col items-center justify-center p-6 hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] h-32 md:h-40"
            >
              <div className="flex items-center justify-center mb-3">
                <CategoryIcon 
                  categoryName={category.name}
                  isMobile={isMobile}
                  isVisible={index < 4} // First 4 categories are visible immediately
                />
              </div>
              <h3 className="text-center text-[#1A1A1A] text-sm md:text-base font-semibold">
                {categoryLabels[category.name] || category.label}
              </h3>
            </Card>
          ))}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientServices;


import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import BackButton from '@/components/ui/back-button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Home, Scissors, PawPrint, Globe, Dumbbell, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon> = {
  'classes': Book,
  'personal-care': Scissors,
  'sports': Dumbbell,
  'home': Home,
  'pets': PawPrint,
  'other': Globe,
};

// Nombres de categorías en español
const categoryLabels: Record<string, string> = {
  'classes': 'Clases',
  'personal-care': 'Cuidado Personal',
  'sports': 'Deportes',
  'home': 'Hogar',
  'pets': 'Mascotas',
  'other': 'Otros',
};

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: serviceTypes = [], isLoading } = useQuery({
    queryKey: ['service-types', categoryName],
    queryFn: async () => {
      // First get the category ID
      const { data: categories, error: categoryError } = await supabase
        .from('service_categories')
        .select('id')
        .eq('name', categoryName)
        .single();
        
      if (categoryError) throw categoryError;
      
      // Then get service types for this category
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categories.id);
        
      if (error) throw error;
      return data;
    }
  });

  const handleServiceClick = (serviceTypeId: string) => {
    navigate(`/client/results/${categoryName}/${serviceTypeId}`);
  };

  const handleBack = () => {
    navigate('/client');
  };

  if (isLoading) {
    return (
      <PageContainer
        title=""
        className="pt-0 bg-white"
      >
        {/* Back button positioned absolutely in top-left */}
        <div className="absolute top-4 left-4 z-10">
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        {/* Category title */}
        <div className="text-center mb-6 mt-16">
          <Skeleton className="h-8 w-32 mx-auto rounded" />
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  const categoryLabel = categoryLabels[categoryName || ''] || categoryName;
  const IconComponent = iconMap[categoryName || ''] || Book;

  return (
    <PageContainer
      title=""
      className="pt-0 bg-white relative"
    >
      {/* Back button positioned absolutely in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <BackButton onClick={handleBack} />
      </div>

      {/* Category title with icon */}
      <div className="text-center mb-8 mt-16">
        <div className="flex items-center justify-center gap-3 mb-2">
          <IconComponent 
            size={isMobile ? 24 : 32}
            strokeWidth={isMobile ? 2 : 1.8}
            className="text-[#1A1A1A]" 
          />
          <h1 className={cn(
            "font-bold tracking-tight text-app-text",
            isMobile ? "text-xl" : "text-2xl md:text-3xl"
          )}>
            {categoryLabel}
          </h1>
        </div>
      </div>

      {/* Services grid with same styling as category cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
        {serviceTypes.map((serviceType) => {
          return (
            <div key={serviceType.id} onClick={() => handleServiceClick(serviceType.id)}>
              <Card className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300 ease-in-out",
                "bg-white border border-gray-200 shadow-md hover:shadow-lg",
                "flex flex-col items-center justify-center",
                "rounded-xl p-6",
                isMobile ? "h-32 min-h-32" : "h-40 min-h-40"
              )}>
                <h3 className={cn(
                  "text-center font-semibold text-[#1A1A1A] leading-tight",
                  "overflow-wrap-anywhere hyphens-auto",
                  isMobile ? "text-sm px-2" : "text-base px-3"
                )}>
                  {serviceType.name}
                </h3>
              </Card>
            </div>
          );
        })}
        
        {serviceTypes.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryDetails;

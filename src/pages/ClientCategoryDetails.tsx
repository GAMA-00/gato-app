import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import BackButton from '@/components/ui/back-button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Globe, Dumbbell, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon | 'custom-home' | 'custom-pets' | 'custom-classes' | 'custom-personal-care' | 'custom-sports' | 'custom-other'> = {
  'classes': 'custom-classes',
  'personal-care': 'custom-personal-care',
  'sports': 'custom-sports',
  'home': 'custom-home',
  'pets': 'custom-pets',
  'other': 'custom-other',
};

// Mapa de iconos específico para service types
const serviceTypeIconMap: Record<string, 'custom-cleaning' | 'custom-ironing'> = {
  'Limpieza': 'custom-cleaning',
  'Planchado': 'custom-ironing',
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
      <div className="min-h-screen w-full bg-white relative">
        {/* Back button positioned absolutely in top-left corner */}
        <div className="absolute top-4 left-4 z-10">
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>

        {/* Category title */}
        <div className="pt-20 pb-6">
          <div className="text-center">
            <Skeleton className="h-8 w-32 mx-auto rounded" />
          </div>
        </div>

        {/* Services grid */}
        <div className="px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categoryLabel = categoryLabels[categoryName || ''] || categoryName;
  const iconComponent = iconMap[categoryName || ''] || Book;

  return (
    <div className="min-h-screen w-full bg-white relative">
      {/* Back button positioned absolutely in top-left corner */}
      <div className="absolute top-4 left-4 z-10">
        <BackButton onClick={handleBack} />
      </div>

      {/* Category title with icon */}
      <div className="pt-20 pb-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {iconComponent === 'custom-home' ? (
              <img 
                src="/lovable-uploads/f07d1b81-bbce-4517-9604-c3f62da6a1cc.png"
                alt="Hogar"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : iconComponent === 'custom-pets' ? (
              <img 
                src="/lovable-uploads/2a5a7cb4-2bbb-4182-8e3e-104e97e9e4a4.png"
                alt="Mascotas"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : iconComponent === 'custom-classes' ? (
              <img 
                src="/lovable-uploads/0270a22a-9e98-44c3-822d-78902b399852.png"
                alt="Clases"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : iconComponent === 'custom-personal-care' ? (
              <img 
                src="/lovable-uploads/418f124f-c897-4235-af63-b3bfa86e82b0.png"
                alt="Cuidado Personal"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : iconComponent === 'custom-sports' ? (
              <img 
                src="/lovable-uploads/32716d11-a812-4004-80ce-c321b2875dbd.png"
                alt="Deportes"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : iconComponent === 'custom-other' ? (
              <img 
                src="/lovable-uploads/93a01a24-483d-4e55-81ad-283713da9c6b.png"
                alt="Otros"
                className={cn(
                  "object-contain",
                  isMobile ? "w-20 h-20" : "w-24 h-24"
                )}
              />
            ) : (
              React.createElement(iconComponent as LucideIcon, {
                size: isMobile ? 54 : 72,
                strokeWidth: isMobile ? 2 : 1.8,
                className: "text-[#1A1A1A]"
              })
            )}
            <h1 className={cn(
              "font-bold tracking-tight text-app-text",
              isMobile ? "text-xl" : "text-2xl md:text-3xl"
            )}>
              {categoryLabel}
            </h1>
          </div>
        </div>
      </div>

      {/* Services grid with consistent styling */}
      <div className="px-4 md:px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
            {serviceTypes.map((serviceType) => {
              // Check if this service type has a custom icon
              const hasCustomIcon = serviceTypeIconMap[serviceType.name];
              
              return (
                <div key={serviceType.id} onClick={() => handleServiceClick(serviceType.id)}>
                  <Card className={cn(
                    "relative overflow-hidden cursor-pointer transition-all duration-300 ease-in-out",
                    "bg-[#F2F2F2] border border-gray-200 shadow-sm hover:shadow-md",
                    "flex flex-col items-center justify-center",
                    "rounded-xl p-4",
                    hasCustomIcon ? "h-40 min-h-40" : "h-32 min-h-32"
                  )}>
                    {hasCustomIcon && (
                      <div className={cn(
                        "flex items-center justify-center mb-3",
                        isMobile ? "mb-2" : "mb-3"
                      )}>
                        {serviceType.name === 'Limpieza' && (
                          <img 
                            src="/lovable-uploads/6047527f-3ae9-4185-ac20-e270f9ca6564.png"
                            alt="Limpieza"
                            className={cn(
                              "object-contain",
                              isMobile ? "w-12 h-12" : "w-16 h-16"
                            )}
                          />
                        )}
                        {serviceType.name === 'Planchado' && (
                          <img 
                            src="/lovable-uploads/76ed8eca-0a47-4f10-9c81-4952f3bbffac.png"
                            alt="Planchado"
                            className={cn(
                              "object-contain",
                              isMobile ? "w-12 h-12" : "w-16 h-16"
                            )}
                          />
                        )}
                      </div>
                    )}
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
        </div>
      </div>
    </div>
  );
};

export default ClientCategoryDetails;

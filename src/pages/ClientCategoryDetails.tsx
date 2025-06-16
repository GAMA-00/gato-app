
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

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', categoryName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('category', categoryName);
        
      if (error) throw error;
      return data;
    }
  });

  const handleServiceClick = (serviceId: string) => {
    navigate(`/client/results/${categoryName}/${serviceId}`);
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
        {/* Back button at the top */}
        <div className="w-full flex justify-center mb-6">
          <div className="w-full max-w-4xl px-2 md:px-6">
            <div className="flex justify-start">
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Category title */}
        <div className="text-center mb-6">
          <Skeleton className="h-8 w-32 mx-auto rounded" />
        </div>

        {/* Services grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-2 md:px-6 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className={cn(isMobile ? "h-28" : "h-32 md:h-40", "rounded-xl")} />
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
      className="pt-0 bg-white"
    >
      {/* Back button at the top - centered container */}
      <div className="w-full flex justify-center mb-6">
        <div className="w-full max-w-4xl px-2 md:px-6">
          <div className="flex justify-start">
            <BackButton onClick={handleBack} />
          </div>
        </div>
      </div>

      {/* Category title with icon */}
      <div className="text-center mb-6">
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

      {/* Services grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-2 md:px-6 max-w-4xl mx-auto animate-fade-in">
        {services.map((service) => {
          const textSizeClass = isMobile ? 'text-sm' : 'text-lg';
          
          return (
            <div key={service.id} onClick={() => handleServiceClick(service.id)}>
              <Card className={cn(
                "flex flex-col items-center justify-center hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group",
                isMobile ? "p-4 h-28" : "p-8 h-48"
              )}>
                <h3 className={cn(
                  "text-center font-semibold text-[#1A1A1A] overflow-wrap-anywhere hyphens-auto",
                  textSizeClass,
                  isMobile ? "px-1" : "px-2"
                )}>
                  {service.name}
                </h3>
              </Card>
            </div>
          );
        })}
        
        {services.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryDetails;


import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Scissors, PawPrint, Globe, Dumbbell, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon | 'custom-home'> = {
  'classes': Book,
  'personal-care': Scissors,
  'sports': Dumbbell,
  'home': 'custom-home',
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

// Nuevo orden específico para las categorías
const categoryOrder = ['home', 'pets', 'classes', 'personal-care', 'sports', 'other'];

const ClientCategoryView = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: fetchedCategories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*');
        
      if (error) throw error;
      return data;
    }
  });

  // Organizar categorías en el orden deseado
  const categories = [...fetchedCategories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a.name);
    const indexB = categoryOrder.indexOf(b.name);
    return indexA - indexB;
  });

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <PageContainer
        title={
          <div className="text-center w-full">
            Explora nuestras categorías de servicio
          </div>
        }
        className="pt-0 bg-white"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-2 md:px-6 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className={cn(isMobile ? "h-28" : "h-32 md:h-40", "rounded-xl")} />
          ))}
        </div>
      </PageContainer>
    );
  }

  // Define optimized icon size and stroke width for mobile
  const iconSize = isMobile ? 28 : 48; // Smaller icons on mobile
  const strokeWidth = isMobile ? 2 : 1.8;
  
  return (
    <PageContainer
      title={
        <div className="text-center w-full">
          Explora nuestras categorías de servicio
        </div>
      }
      className="pt-0 bg-white"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 px-2 md:px-6 max-w-4xl mx-auto animate-fade-in">
        {categoryOrder.map((categoryName) => {
          const category = categories.find(c => c.name === categoryName);
          if (!category) return null;
          
          // Obtener el icono según el nombre de la categoría
          const iconComponent = iconMap[category.name] || Book;
          
          const textSizeClass = isMobile ? 'text-sm' : 'text-lg'; // Smaller text on mobile
          
          return (
            <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
              <Card className={cn(
                "flex flex-col items-center justify-center hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group",
                isMobile ? "p-4 h-28" : "p-8 h-48"
              )}>
                <div className={cn(
                  "flex items-center justify-center",
                  isMobile ? "mb-2" : "mb-4"
                )}>
                  {iconComponent === 'custom-home' ? (
                    <img 
                      src="/lovable-uploads/f07d1b81-bbce-4517-9604-c3f62da6a1cc.png"
                      alt="Hogar"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-7 h-7" : "w-12 h-12"
                      )}
                    />
                  ) : (
                    React.createElement(iconComponent as LucideIcon, {
                      size: iconSize,
                      strokeWidth: strokeWidth,
                      className: "text-[#1A1A1A]"
                    })
                  )}
                </div>
                <h3 className={cn(
                  "text-center font-semibold text-[#1A1A1A] overflow-wrap-anywhere hyphens-auto",
                  textSizeClass,
                  isMobile ? "px-1" : "px-2"
                )}>
                  {categoryLabels[category.name] || category.label}
                </h3>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

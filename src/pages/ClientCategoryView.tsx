import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Dumbbell, Globe, LucideIcon } from 'lucide-react';
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

  // Define optimized icon size and stroke width for mobile - increased by 50%
  const iconSize = isMobile ? 42 : 72; // Increased from 28 to 42 and 48 to 72
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
                        isMobile ? "w-18 h-18" : "w-24 h-24"
                      )}
                    />
                  ) : iconComponent === 'custom-pets' ? (
                    <img 
                      src="/lovable-uploads/2a5a7cb4-2bbb-4182-8e3e-104e97e9e4a4.png"
                      alt="Mascotas"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-18 h-18" : "w-24 h-24"
                      )}
                    />
                  ) : iconComponent === 'custom-classes' ? (
                    <img 
                      src="/lovable-uploads/0270a22a-9e98-44c3-822d-78902b399852.png"
                      alt="Clases"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-18 h-18" : "w-24 h-24"
                      )}
                    />
                  ) : iconComponent === 'custom-personal-care' ? (
                    <img 
                      src="/lovable-uploads/418f124f-c897-4235-af63-b3bfa86e82b0.png"
                      alt="Cuidado Personal"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-18 h-18" : "w-24 h-24"
                      )}
                    />
                  ) : iconComponent === 'custom-sports' ? (
                    <img 
                      src="/lovable-uploads/32716d11-a812-4004-80ce-c321b2875dbd.png"
                      alt="Deportes"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-18 h-18" : "w-24 h-24"
                      )}
                    />
                  ) : iconComponent === 'custom-other' ? (
                    <img 
                      src="/lovable-uploads/93a01a24-483d-4e55-81ad-283713da9c6b.png"
                      alt="Otros"
                      className={cn(
                        "object-contain",
                        isMobile ? "w-18 h-18" : "w-24 h-24"
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

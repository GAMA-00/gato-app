
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Home, Scissors, Dog, Globe, Dumbbell, LucideIcon } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

// Mapa de iconos específico para cada categoría
const iconMap: Record<string, LucideIcon> = {
  'classes': Book,
  'personal-care': Scissors,
  'sports': Dumbbell,
  'home': Home,
  'pets': Dog,
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
        title="Explora nuestras categorías de servicio"
        className="pt-1 bg-white" // Fondo blanco
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-6 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32 md:h-40 rounded-xl" />
          ))}
        </div>
      </PageContainer>
    );
  }

  // Define consistent icon size and stroke width for ALL icons
  const iconSize = isMobile ? 40 : 58; // Tamaño más grande para iconos
  const strokeWidth = 1.8;

  return (
    <PageContainer
      title="Explora nuestras categorías de servicio"
      className="pt-1 bg-white" // Fondo blanco
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8 px-4 md:px-6 max-w-4xl mx-auto animate-fade-in">
        {categoryOrder.map((categoryName) => {
          const category = categories.find(c => c.name === categoryName);
          if (!category) return null;
          
          // Obtener el icono según el nombre de la categoría
          const IconComponent = iconMap[category.name] || Book;
          
          return (
            <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
              <Card className={`flex flex-col items-center justify-center p-6 md:p-8 hover:shadow-lg transition-all cursor-pointer bg-[#F2F2F2] group ${isMobile ? 'h-36' : 'h-48'}`}>
                <IconComponent size={iconSize} strokeWidth={strokeWidth} className="text-[#1A1A1A] mb-4" />
                <h3 className="text-center font-semibold text-xl md:text-2xl text-[#1A1A1A]">{categoryLabels[category.name] || category.label}</h3>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;


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

// Orden específico para las categorías
const categoryOrder = ['classes', 'personal-care', 'sports', 'home', 'pets', 'other'];

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
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 md:h-36 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Explora nuestras categorías de servicio"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {categoryOrder.map((categoryName) => {
          const category = categories.find(c => c.name === categoryName);
          if (!category) return null;
          
          // Obtener el icono según el nombre de la categoría
          const IconComponent = iconMap[category.name] || Book;
          
          return (
            <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
              <Card className={`flex flex-col items-center p-3 md:p-6 hover:shadow-lg transition-all cursor-pointer bg-black text-white justify-center group ${isMobile ? 'h-28' : 'h-36'}`}>
                <div className={`${isMobile ? 'w-14 h-14' : 'w-18 h-18'} rounded-full flex items-center justify-center bg-white mb-2 group-hover:bg-white/90 transition-colors`}>
                  <IconComponent size={isMobile ? 24 : 30} className="text-black" />
                </div>
                <h3 className="text-center font-medium text-sm md:text-base text-white">{categoryLabels[category.name] || category.label}</h3>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

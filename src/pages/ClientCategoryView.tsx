
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Book, Home, Scissors, LucideIcon, Users, Briefcase, Utensils, Wrench } from 'lucide-react';

// Expanded icon map with more icon options for categories
const iconMap: Record<string, LucideIcon> = {
  'Book': Book,
  'Home': Home, 
  'Scissors': Scissors,
  'Users': Users,
  'Briefcase': Briefcase,
  'Utensils': Utensils,
  'Wrench': Wrench
};

const ClientCategoryView = () => {
  const navigate = useNavigate();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('label');
        
      if (error) throw error;
      return data;
    }
  });

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Explora nuestras categorías de servicio"
        subtitle="Selecciona una categoría para ver los servicios disponibles"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-4 max-w-5xl mx-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Explora nuestras categorías de servicio"
      subtitle="Selecciona una categoría para ver los servicios disponibles"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-2 md:px-4 max-w-5xl mx-auto animate-fade-in">
        {categories.map((category) => {
          // Get icon based on the icon property or use a fallback
          const IconComponent = iconMap[category.icon] || Book;
          
          return (
            <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
              <Card className="flex flex-col items-center p-6 hover:shadow-luxury transition-all cursor-pointer bg-luxury-white h-28 justify-center group">
                <div className="w-14 h-14 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-3 group-hover:bg-luxury-beige transition-colors">
                  <IconComponent size={28} />
                </div>
                <h3 className="text-center font-medium text-sm md:text-base">{category.label}</h3>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

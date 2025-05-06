
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, Scissors, PawPrint, Dumbbell, Book, Globe, Car, Flower, Wrench, MoreHorizontal } from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, React.ElementType> = {
  'Home': Home,
  'Scissors': Scissors,
  'PawPrint': PawPrint,
  'Dumbbell': Dumbbell,
  'Book': Book,
  'Globe': Globe,
  'Car': Car,
  'Flower': Flower,
  'Wrench': Wrench,
  'MoreHorizontal': MoreHorizontal
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

  const getCategoryIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || iconMap['Globe'];
    return <IconComponent size={24} />;
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/category/${categoryName}`);
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Explora nuestras categorías de servicio"
        subtitle="Selecciona una categoría para ver los servicios disponibles"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {categories.map((category) => {
          const IconComponent = category.icon && iconMap[category.icon] ? 
            getCategoryIcon(category.icon) : 
            <span className="text-2xl">{category.name.charAt(0).toUpperCase()}</span>;
          
          return (
            <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
              <Card className="flex flex-col items-center p-4 hover:shadow-luxury transition-shadow cursor-pointer bg-luxury-white h-24 justify-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-2">
                  {IconComponent}
                </div>
                <h3 className="text-center font-medium text-sm">{category.label}</h3>
              </Card>
            </div>
          );
        })}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

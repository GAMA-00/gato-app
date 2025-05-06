
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Home, Scissors, PawPrint, Dumbbell, Book, Globe } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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

  // Mapeo de iconos según el nombre de la categoría
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'home': return <Home size={24} />; // Reducido de 32 a 24
      case 'scissors': return <Scissors size={24} />;
      case 'paw-print': return <PawPrint size={24} />;
      case 'dumbbell': return <Dumbbell size={24} />;
      case 'book': return <Book size={24} />;
      case 'globe': return <Globe size={24} />;
      default: return <Globe size={24} />;
    }
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
        {categories.map((category) => (
          <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
            <Card className="flex flex-col items-center p-4 hover:shadow-luxury transition-shadow cursor-pointer bg-luxury-white h-24 justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-2">
                {getCategoryIcon(category.icon)}
              </div>
              <h3 className="text-center font-medium text-sm">{category.label}</h3>
            </Card>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

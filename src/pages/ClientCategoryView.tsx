
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
      case 'home': return <Home size={32} />;
      case 'scissors': return <Scissors size={32} />;
      case 'paw-print': return <PawPrint size={32} />;
      case 'dumbbell': return <Dumbbell size={32} />;
      case 'book': return <Book size={32} />;
      case 'globe': return <Globe size={32} />;
      default: return <Globe size={32} />;
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
        {categories.map((category) => (
          <div key={category.id} onClick={() => handleCategoryClick(category.name)}>
            <Card className="flex flex-col items-center p-6 hover:shadow-luxury transition-shadow cursor-pointer bg-luxury-white">
              <div className="w-20 h-20 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-4">
                {getCategoryIcon(category.icon)}
              </div>
              <h3 className="text-center font-medium">{category.label}</h3>
              <p className="text-xs text-center text-muted-foreground mt-1">
                Servicios de {category.label.toLowerCase()}
              </p>
            </Card>
          </div>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

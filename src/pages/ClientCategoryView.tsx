
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Home, Scissors, PawPrint, Dumbbell, Book, Globe, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES } from '@/lib/data';

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
      case 'home': return <Home size={24} />; 
      case 'scissors': return <Scissors size={24} />;
      case 'paw-print': return <PawPrint size={24} />;
      case 'dumbbell': return <Dumbbell size={24} />;
      case 'book': return <Book size={24} />;
      case 'globe': return <Globe size={24} />;
      default: return <Globe size={24} />;
    }
  };

  const handleCategoryClick = (categoryName: string) => {
    navigate(`/client/services/${categoryName}`);
  };

  const handleBack = () => {
    navigate('/client');
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Explora nuestras categorías de servicio"
        subtitle="Selecciona una categoría para ver los servicios disponibles"
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto">
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
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver al inicio</span>
        </Button>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {categories.map((category) => (
          <Card 
            key={category.id} 
            onClick={() => handleCategoryClick(category.name)}
            className="flex flex-col items-center p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white h-24 justify-center border-l-4"
            style={{ 
              borderLeftColor: SERVICE_CATEGORIES[category.name as keyof typeof SERVICE_CATEGORIES]?.color || '#333' 
            }}
          >
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center mb-2" 
              style={{ 
                backgroundColor: SERVICE_CATEGORIES[category.name as keyof typeof SERVICE_CATEGORIES]?.bgColor || '#f3f4f6',
                color: SERVICE_CATEGORIES[category.name as keyof typeof SERVICE_CATEGORIES]?.color || '#333' 
              }}
            >
              {getCategoryIcon(category.icon)}
            </div>
            <h3 className="text-center font-medium text-sm">{category.label}</h3>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
};

export default ClientCategoryView;

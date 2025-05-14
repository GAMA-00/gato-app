
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, Home, Scissors, Dog, Globe, Dumbbell, LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  useEffect(() => {
    console.log("ClientCategoryDetails rendered with category:", categoryName);
  }, [categoryName]);
  
  // Obtain category information
  const { data: categoryInfo, isLoading: loadingCategory } = useQuery({
    queryKey: ['category-info', categoryName],
    queryFn: async () => {
      if (!categoryName) return null;
      
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('name', categoryName)
        .single();
        
      if (error) {
        console.error("Error fetching category:", error);
        toast.error("Error al cargar la categoría");
        throw error;
      }
      
      console.log("Category info fetched:", data);
      return data;
    },
    enabled: !!categoryName
  });
  
  // Get services for this category
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['category-services', categoryName, categoryInfo?.id],
    queryFn: async () => {
      if (!categoryName || !categoryInfo) return [];
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categoryInfo.id)
        .order('name');
        
      if (error) {
        console.error("Error fetching services:", error);
        toast.error("Error al cargar los servicios");
        throw error;
      }
      
      console.log("Services fetched:", data);
      return data;
    },
    enabled: !!categoryName && !!categoryInfo
  });

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    console.log("Service selected:", serviceId, "Category:", categoryName);
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };

  // Go back to categories page
  const handleBack = () => {
    navigate('/client');
  };

  const isLoading = loadingCategory || loadingServices;
  
  // Determinar el icono correcto para esta categoría
  const CategoryIcon = categoryName ? iconMap[categoryName] || Book : Book;
  
  // Determinar la etiqueta en español
  const displayLabel = categoryName ? categoryLabels[categoryName] || categoryInfo?.label || '' : '';

  // Create the back button as a React element
  const backButton = (
    <Button 
      variant="ghost" 
      onClick={handleBack} 
      className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft size={16} className="mr-1" />
      <span>Volver a categorías</span>
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer
        title="Cargando servicios..."
        subtitle={backButton}
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
      title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white">
            <CategoryIcon size={24} className="text-black" />
          </div>
          <span>{displayLabel}</span>
        </div>
      }
      subtitle={backButton}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {services.map((service) => (
          <Card 
            key={service.id}
            className={`flex flex-col items-center p-3 md:p-6 hover:shadow-lg transition-all cursor-pointer bg-black text-white justify-center group ${isMobile ? 'h-28' : 'h-36'}`}
            onClick={() => handleServiceSelect(service.id)}
          >
            <div className={`${isMobile ? 'w-14 h-14' : 'w-18 h-18'} rounded-full flex items-center justify-center bg-white mb-2 group-hover:bg-white/90 transition-colors`}>
              <CategoryIcon size={isMobile ? 24 : 30} className="text-black" />
            </div>
            <h3 className="text-center font-medium text-sm md:text-base text-white">{service.name}</h3>
          </Card>
        ))}
      </div>
      
      {services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay servicios disponibles en esta categoría.</p>
        </div>
      )}
    </PageContainer>
  );
};

export default ClientCategoryDetails;

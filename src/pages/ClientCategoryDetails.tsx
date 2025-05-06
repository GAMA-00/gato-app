
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Book, Home, Scissors } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Define proper icon typing
const categoryIcons: Record<string, React.ReactElement> = {
  'home': <Home size={24} />,
  'personal-care': <Scissors size={24} />,
  'classes': <Book size={24} />
};

const ClientCategoryDetails = () => {
  const { categoryName } = useParams<{ categoryName: string }>();
  const navigate = useNavigate();
  
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
  
  // Determine the correct icon for this category - ensuring proper React Element type
  let categoryIcon = <Book size={24} />; // Default fallback as React Element
  
  if (categoryName) {
    if (categoryName === 'home' || categoryName.includes('home')) {
      categoryIcon = <Home size={24} />;
    } else if (categoryName === 'personal-care' || categoryName.includes('care')) {
      categoryIcon = <Scissors size={24} />;
    } else if (categoryName && categoryIcons[categoryName]) {
      categoryIcon = categoryIcons[categoryName];
    }
  }
  
  const categoryLabel = categoryInfo?.label || '';

  if (isLoading) {
    return (
      <PageContainer
        title="Cargando servicios..."
        subtitle={
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Volver a categorías</span>
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy">
            {categoryIcon}
          </div>
          <span>{categoryLabel}</span>
        </div>
      }
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a categorías</span>
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 px-2 md:px-4 max-w-4xl mx-auto animate-fade-in">
        {services.map((service) => (
          <Card 
            key={service.id}
            className="flex flex-col items-center p-4 hover:shadow-md transition-shadow cursor-pointer bg-luxury-white h-24 justify-center"
            onClick={() => handleServiceSelect(service.id)}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-luxury-gray text-luxury-navy mb-2">
              {categoryIcon}
            </div>
            <h3 className="text-center font-medium text-sm">{service.name}</h3>
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

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';
import * as LucideIcons from 'lucide-react';

const ClientCategoryDetails = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .eq('name', categoryId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  const { data: serviceTypes = [], isLoading: serviceTypesLoading } = useQuery({
    queryKey: ['service-types', categoryData?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('category_id', categoryData.id);
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!categoryData?.id,
  });

  const isLoading = categoryLoading || serviceTypesLoading;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Tipos de Servicio" subtitle="Cargando...">
          <div className="space-y-4">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32 rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  const categoryLabel = categoryData?.label || categoryId;

  // Get the category icon from the database
  const getServiceIcon = (iconName: string) => {
    if (!iconName) return LucideIcons.Briefcase;
    
    // Convert icon name to PascalCase for Lucide icons
    const iconKey = iconName.charAt(0).toUpperCase() + iconName.slice(1).replace(/-/g, '');
    const IconComponent = (LucideIcons as any)[iconKey];
    
    return IconComponent || LucideIcons.Briefcase;
  };

  const CategoryIcon = getServiceIcon(categoryData?.icon || 'briefcase');

  return (
    <>
      <Navbar />
      <PageContainer title="Tipos de Servicio" subtitle={`Categoría: ${categoryLabel}`}>
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/client/categories')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a categorías
          </Button>
          
          {serviceTypes.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay tipos de servicio disponibles para esta categoría.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {serviceTypes.map((serviceType) => {
                const ServiceIcon = CategoryIcon; // Use the same icon as the category
                
                return (
                  <Card 
                    key={serviceType.id}
                    className="p-4 hover:shadow-lg transition-all cursor-pointer bg-white border border-gray-100"
                    onClick={() => navigate(`/client/results?serviceId=${serviceType.id}&categoryName=${encodeURIComponent(categoryLabel)}`)}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 bg-luxury-navy rounded-full flex items-center justify-center">
                        <ServiceIcon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm text-gray-900 mb-1">{serviceType.name}</h3>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientCategoryDetails;

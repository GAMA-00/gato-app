
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {serviceTypes.map((serviceType) => (
                <Card 
                  key={serviceType.id}
                  className="p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate(`/client/providers?serviceType=${serviceType.name}`)}
                >
                  <h3 className="font-semibold text-lg mb-2">{serviceType.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    Encuentra proveedores de {serviceType.name}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientCategoryDetails;

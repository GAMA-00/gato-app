
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import ServiceTypeCard from '@/components/client/ServiceTypeCard';
import CategoryDetailsLoading from '@/components/client/CategoryDetailsLoading';

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
    return <CategoryDetailsLoading />;
  }

  const categoryLabel = categoryData?.label || categoryId;

  return (
    <>
      <Navbar />
      <PageContainer title={categoryLabel} subtitle="">
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
              {serviceTypes.map((serviceType) => (
                <ServiceTypeCard
                  key={serviceType.id}
                  serviceType={serviceType}
                  categoryId={categoryId || ''}
                  categoryLabel={categoryLabel}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </>
  );
};

export default ClientCategoryDetails;

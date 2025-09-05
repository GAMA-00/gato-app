import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ServiceTypeCard from '@/components/client/ServiceTypeCard';
import CategoryDetailsLoading from '@/components/client/CategoryDetailsLoading';
import ClientPageLayout from '@/components/layout/ClientPageLayout';

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
      
      // Orden personalizado para la categoría "Hogar"
      const customOrder = [
        'Lavacar',
        'Chef privado', 
        'Hidrolavado (ventanas, fachadas, aceras)',
        'Fumigación',
        'Mantenimiento',
        'Jardinero',
        'Planchado',
        'Floristería'
      ];
      
      const sortedData = (data || []).sort((a, b) => {
        const indexA = customOrder.indexOf(a.name);
        const indexB = customOrder.indexOf(b.name);
        
        // Si ambos están en el orden personalizado, usar ese orden
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB;
        }
        
        // Si solo uno está en el orden personalizado, ponerlo primero
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        
        // Si ninguno está en el orden personalizado, mantener orden alfabético
        return a.name.localeCompare(b.name);
      });
      
      return sortedData;
    },
    enabled: !!categoryData?.id,
  });

  const isLoading = categoryLoading || serviceTypesLoading;

  if (isLoading) {
    return <CategoryDetailsLoading />;
  }

  const categoryLabel = categoryData?.label || categoryId;

  return (
    <ClientPageLayout 
      title={categoryLabel}
    >
      <div className="space-y-6">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
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
    </ClientPageLayout>
  );
};

export default ClientCategoryDetails;

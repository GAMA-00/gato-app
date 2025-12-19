import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import ServiceTypeCard from '@/components/client/ServiceTypeCard';
import CategoryDetailsLoading from '@/components/client/CategoryDetailsLoading';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { useServiceTypeAvailability } from '@/hooks/useServiceTypeAvailability';
import { serviceTypeOrderByCategory, categoriesWithoutReorder } from '@/constants/serviceTypeOrderConstants';

const ClientCategoryDetails = () => {
  const { categoryId } = useParams();
  const { availableServiceTypeIds, isLoading: availabilityLoading } = useServiceTypeAvailability();

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

  // Ordenar service types dinámicamente
  const sortedServiceTypes = useMemo(() => {
    if (!serviceTypes.length) return [];
    
    // Si la categoría no debe reordenarse, devolver tal cual
    if (categoriesWithoutReorder.includes(categoryId || '')) {
      return serviceTypes;
    }

    // Obtener el orden preferido para esta categoría
    const preferredOrder = serviceTypeOrderByCategory[categoryId || ''] || [];

    // Separar service types con y sin providers
    const withProviders = serviceTypes.filter(st => availableServiceTypeIds.has(st.id));
    const withoutProviders = serviceTypes.filter(st => !availableServiceTypeIds.has(st.id));

    // Ordenar los que tienen providers según el orden preferido
    const orderedWithProviders = [...withProviders].sort((a, b) => {
      const indexA = preferredOrder.findIndex(name => 
        a.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(a.name.toLowerCase())
      );
      const indexB = preferredOrder.findIndex(name => 
        b.name.toLowerCase().includes(name.toLowerCase()) || 
        name.toLowerCase().includes(b.name.toLowerCase())
      );

      // Si ambos están en el orden preferido
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      // Si solo uno está en el orden preferido, ponerlo primero
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      // Si ninguno está, ordenar alfabéticamente
      return a.name.localeCompare(b.name);
    });

    // Ordenar los sin providers alfabéticamente
    const orderedWithoutProviders = [...withoutProviders].sort((a, b) => 
      a.name.localeCompare(b.name)
    );

    return [...orderedWithProviders, ...orderedWithoutProviders];
  }, [serviceTypes, availableServiceTypeIds, categoryId]);

  const isLoading = categoryLoading || serviceTypesLoading || availabilityLoading;

  if (isLoading) {
    return <CategoryDetailsLoading />;
  }

  const categoryLabel = categoryData?.label || categoryId;

  return (
    <ClientPageLayout>
      <div className="space-y-6">
        {/* Centered title */}
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-[#2D2D2D]">
            {categoryLabel}
          </h1>
        </div>
        
        {sortedServiceTypes.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No hay tipos de servicio disponibles para esta categoría.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {sortedServiceTypes.map((serviceType) => (
              <ServiceTypeCard
                key={serviceType.id}
                serviceType={serviceType}
                categoryId={categoryId || ''}
                categoryLabel={categoryLabel}
                hasProviders={availableServiceTypeIds.has(serviceType.id)}
              />
            ))}
          </div>
        )}
      </div>
    </ClientPageLayout>
  );
};

export default ClientCategoryDetails;

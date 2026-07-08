import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import ServiceTypeCard from '@/components/client/ServiceTypeCard';
import { categoryLabels } from '@/constants/categoryConstants';
import { ChevronLeft } from 'lucide-react';

const db = supabase as any;

const useServiceTypesByCategory = (categoryName: string) => {
  return useQuery({
    queryKey: ['service-types-by-category', categoryName],
    enabled: !!categoryName,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Get category
      const { data: cat } = await db
        .from('service_categories')
        .select('id, name, label')
        .eq('name', categoryName)
        .maybeSingle();
      if (!cat) return { category: null, serviceTypes: [], activeTypeIds: new Set<string>() };

      // 2. Get service types for this category
      const { data: types } = await db
        .from('service_types')
        .select('id, name')
        .eq('category_id', cat.id)
        .order('name');

      if (!types?.length) return { category: cat, serviceTypes: [], activeTypeIds: new Set<string>() };

      // 3. Find which service types have active listings (to show "Próximamente" for empty ones)
      const typeIds = types.map((t: any) => t.id);
      const { data: activeListings } = await db
        .from('listings')
        .select('service_type_id')
        .in('service_type_id', typeIds)
        .eq('is_active', true);

      const activeTypeIds = new Set<string>(
        (activeListings || []).map((l: any) => l.service_type_id)
      );

      return { category: cat, serviceTypes: types || [], activeTypeIds };
    },
  });
};

const ClientCategoryDetails = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useServiceTypesByCategory(categoryId ?? '');

  const label = categoryLabels[categoryId ?? ''] ?? data?.category?.label ?? categoryId ?? '';
  const serviceTypes = data?.serviceTypes ?? [];
  const activeTypeIds = data?.activeTypeIds ?? new Set<string>();

  return (
    <ClientPageLayout title={label}>
      <button
        onClick={() => navigate('/client/categories')}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Todas las categorías
      </button>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {!isLoading && serviceTypes.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No hay tipos de servicio disponibles.</p>
        </div>
      )}

      {!isLoading && serviceTypes.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {serviceTypes.map((st: any) => (
            <ServiceTypeCard
              key={st.id}
              serviceType={st}
              categoryId={categoryId ?? ''}
              categoryLabel={label}
              hasProviders={activeTypeIds.has(st.id)}
            />
          ))}
        </div>
      )}
    </ClientPageLayout>
  );
};

export default ClientCategoryDetails;

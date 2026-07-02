import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, ChevronLeft, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { categoryLabels } from '@/constants/categoryConstants';
import { formatCurrency } from '@/utils/currencyUtils';

const db = supabase as any;

const getInitials = (name?: string | null) =>
  (name || 'P').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();

interface ProviderListing {
  listingId: string;
  providerId: string;
  providerName: string;
  providerAvatar: string | null;
  providerRating: number | null;
  listingTitle: string;
  serviceTypeName: string;
  basePrice: number;
  currency: string;
  duration: number;
  description: string;
}

const useProvidersByCategory = (categoryName: string) => {
  return useQuery({
    queryKey: ['providers-by-category', categoryName],
    enabled: !!categoryName,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ProviderListing[]> => {
      // 1. Get category id
      const { data: cat } = await db
        .from('service_categories')
        .select('id')
        .eq('name', categoryName)
        .maybeSingle();
      if (!cat) return [];

      // 2. Get service_type ids for this category
      const { data: sTypes } = await db
        .from('service_types')
        .select('id, name')
        .eq('category_id', cat.id);
      if (!sTypes?.length) return [];

      const stMap = new Map(sTypes.map((s: any) => [s.id, s.name]));
      const stIds = sTypes.map((s: any) => s.id);

      // 3. Get active listings for those service types
      const { data: listings, error } = await db
        .from('listings')
        .select('id, provider_id, title, description, base_price, currency, duration, service_type_id')
        .in('service_type_id', stIds)
        .eq('is_active', true);
      if (error) throw error;
      if (!listings?.length) return [];

      // 4. Get provider profiles
      const providerIds = [...new Set(listings.map((l: any) => l.provider_id))];
      const { data: providers } = await db
        .from('provider_public_profiles')
        .select('id, name, avatar_url, average_rating')
        .in('id', providerIds);
      const pMap = new Map((providers || []).map((p: any) => [p.id, p]));

      return listings.map((l: any) => {
        const p = pMap.get(l.provider_id) as any;
        return {
          listingId: l.id,
          providerId: l.provider_id,
          providerName: p?.name ?? 'Proveedor',
          providerAvatar: p?.avatar_url ?? null,
          providerRating: p?.average_rating != null ? Number(p.average_rating) : null,
          listingTitle: l.title,
          serviceTypeName: stMap.get(l.service_type_id) ?? l.title,
          basePrice: l.base_price,
          currency: l.currency ?? 'CRC',
          duration: l.duration ?? 60,
          description: l.description ?? '',
        };
      });
    },
  });
};

const ProviderCard = ({ p, onClick }: { p: ProviderListing; onClick: () => void }) => (
  <Card
    className="flex items-center gap-3 p-3 cursor-pointer hover:shadow-md transition-shadow"
    onClick={onClick}
  >
    {/* Avatar */}
    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0 flex items-center justify-center">
      {p.providerAvatar ? (
        <img src={p.providerAvatar} alt={p.providerName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10">
          <span className="text-lg font-bold text-primary/70">{getInitials(p.providerName)}</span>
        </div>
      )}
    </div>

    {/* Info */}
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm truncate">{p.providerName}</p>
      <p className="text-xs text-muted-foreground truncate">{p.serviceTypeName}</p>
      <div className="flex items-center gap-3 mt-1">
        {p.providerRating != null && (
          <div className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{p.providerRating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{p.duration} min</span>
        </div>
      </div>
    </div>

    {/* Price */}
    <div className="shrink-0 text-right">
      <p className="text-sm font-semibold text-primary">
        {formatCurrency(p.basePrice, p.currency as any)}
      </p>
    </div>
  </Card>
);

const ClientCategoryDetails = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { data: providers = [], isLoading } = useProvidersByCategory(categoryId ?? '');
  const label = categoryLabels[categoryId ?? ''] ?? categoryId ?? '';

  return (
    <ClientPageLayout
      title={label}
      subtitle={
        isLoading ? '' :
        providers.length > 0 ? `${providers.length} proveedor${providers.length !== 1 ? 'es' : ''}` :
        'Sin proveedores disponibles'
      }
    >
      {/* Back button */}
      <button
        onClick={() => navigate('/client/categories')}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Todas las categorías
      </button>

      <div className="space-y-3">
        {isLoading && (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        )}

        {!isLoading && providers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground mb-2">No hay proveedores disponibles</p>
            <p className="text-sm text-muted-foreground">Próximamente habrá proveedores en esta categoría.</p>
          </div>
        )}

        {!isLoading && providers.map(p => (
          <ProviderCard
            key={p.listingId}
            p={p}
            onClick={() => navigate(`/client/service/${p.providerId}/${p.listingId}`)}
          />
        ))}
      </div>
    </ClientPageLayout>
  );
};

export default ClientCategoryDetails;


import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Home, Scissors, PawPrint, Dumbbell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home': <Home className="h-6 w-6" />,
  'personal-care': <Scissors className="h-6 w-6" />,
  'pets': <PawPrint className="h-6 w-6" />,
  'sports': <Dumbbell className="h-6 w-6" />,
  'classes': <Book className="h-6 w-6" />
};

const categoryLabels: Record<string, string> = {
  'home': 'Hogar',
  'personal-care': 'Cuidado Personal',
  'pets': 'Mascotas',
  'sports': 'Deportes',
  'classes': 'Clases'
};

const ClientProvidersList = () => {
  const { category, subcat } = useParams();
  const navigate = useNavigate();
  
  // Fetch listings from Supabase based on category and service type name
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings-by-category', category, subcat],
    queryFn: async () => {
      // First get the service_type_id based on name
      const { data: serviceTypes, error: stError } = await supabase
        .from('service_types')
        .select('id, category:category_id(name)')
        .eq('name', subcat || '')
        .limit(1);

      if (stError) throw stError;
      if (!serviceTypes || serviceTypes.length === 0) return [];

      const serviceType = serviceTypes[0];
      
      // Verify that the category matches
      if (serviceType.category && serviceType.category.name !== category) {
        return [];
      }

      // Get all listings for this service type
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          provider:provider_id(
            profile:id(
              name
            )
          )
        `)
        .eq('service_type_id', serviceType.id);
        
      if (listingsError) throw listingsError;
      
      return listingsData.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        price: listing.base_price,
        providerId: listing.provider_id,
        providerName: listing.provider?.profile?.name || 'Proveedor'
      }));
    }
  });

  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const titleText = subcat || '';

  if (isLoading) {
    return (
      <PageContainer
        title={
          <div className="flex items-center gap-2">
            {categoryIcon}
            <span>{titleText}</span>
          </div>
        }
        subtitle={
          <button
            className="text-sm text-muted-foreground hover:underline mb-2"
            onClick={() => navigate('/client')}
          >
            &larr; Volver a categorías
          </button>
        }
      >
        <div className="max-w-lg mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={
        <div className="flex items-center gap-2">
          {categoryIcon}
          <span>{titleText}</span>
        </div>
      }
      subtitle={
        <button
          className="text-sm text-muted-foreground hover:underline mb-2"
          onClick={() => navigate('/client')}
        >
          &larr; Volver a categorías
        </button>
      }
    >
      <div className="max-w-lg mx-auto space-y-4">
        {listings.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Aun no hay proveedores de servicio en esta categoría :/
          </div>
        ) : (
          listings.map((listing) => (
            <Card
              key={listing.id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/client/book/1/${listing.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{listing.title}</span>
                  <span className="text-sm text-muted-foreground">${listing.price.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{listing.description}</div>
                <div className="text-xs mt-2">Ofrecido por: <span className="font-semibold">{listing.providerName}</span></div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  );
};

export default ClientProvidersList;

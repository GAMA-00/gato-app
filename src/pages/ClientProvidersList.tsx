
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Book, Home, Scissors, PawPrint, Dumbbell, ArrowLeft, Star } from 'lucide-react';
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
            id,
            name
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
        providerName: listing.provider?.name || 'Proveedor'
      }));
    }
  });

  const categoryIcon = category ? CATEGORY_ICONS[category] : null;
  const titleText = subcat || '';
  const categoryLabel = category ? categoryLabels[category as keyof typeof categoryLabels] : '';

  if (isLoading) {
    return (
      <PageContainer
        title={
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              {categoryIcon}
            </div>
            <div>
              <span className="text-gradient-primary">{titleText}</span>
              <div className="text-xs text-muted-foreground">{categoryLabel}</div>
            </div>
          </div>
        }
        subtitle={
          <button
            className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
            onClick={() => navigate('/client')}
          >
            <ArrowLeft className="h-4 w-4" /> Volver a categorías
          </button>
        }
      >
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow-sm mb-6">
            <p className="text-sm text-center text-muted-foreground">
              Buscando los mejores proveedores para <span className="font-medium text-navy">{titleText}</span>...
            </p>
          </div>
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
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            {categoryIcon}
          </div>
          <div>
            <span className="text-gradient-primary">{titleText}</span>
            <div className="text-xs text-muted-foreground">{categoryLabel}</div>
          </div>
        </div>
      }
      subtitle={
        <button
          className="text-sm text-indigo-500 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          onClick={() => navigate('/client')}
        >
          <ArrowLeft className="h-4 w-4" /> Volver a categorías
        </button>
      }
    >
      <div className="max-w-lg mx-auto space-y-4">
        {listings.length === 0 ? (
          <div className="py-12 text-center bg-white/50 rounded-xl shadow-soft border border-purple-100/50">
            <Star className="h-12 w-12 text-amber-400 mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Aun no hay proveedores de servicio en esta categoría</p>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-white to-purple-50 p-4 rounded-xl shadow-sm mb-6">
              <p className="text-sm text-muted-foreground">
                Seleccione el servicio que mejor se adapte a sus necesidades:
              </p>
            </div>
            
            {listings.map((listing) => (
              <Card
                key={listing.id}
                className="overflow-hidden hover:shadow-md transition-all cursor-pointer border-l-4 border-l-indigo-400 group"
                onClick={() => navigate(`/client/book/1/${listing.id}`)}
              >
                <CardContent className="p-4 relative">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-transparent to-indigo-50/50 rounded-bl-xl"></div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-navy group-hover:text-indigo-600 transition-colors">{listing.title}</span>
                    <span className="text-sm bg-indigo-50 px-2 py-1 rounded text-indigo-700">${listing.price.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{listing.description}</div>
                  <div className="text-xs mt-3 flex items-center">
                    <span className="text-muted-foreground">Ofrecido por:</span> 
                    <span className="font-semibold ml-1 text-navy">{listing.providerName}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientProvidersList;

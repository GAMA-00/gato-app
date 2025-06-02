
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCommissionRate } from '@/hooks/useCommissionRate';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { SERVICE_CATEGORIES } from '@/lib/data';

const ClientServices = () => {
  const { residenciaId } = useParams();
  const navigate = useNavigate();
  const { commissionRate } = useCommissionRate();
  
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['client-services', residenciaId],
    queryFn: async () => {
      // Query listings and related residencia associations
      const { data: listingResidencias, error: lrError } = await supabase
        .from('listing_residencias')
        .select('listing_id')
        .eq('residencia_id', residenciaId);
        
      if (lrError) throw lrError;
      
      // If no listings for this residencia, return empty array
      if (!listingResidencias || listingResidencias.length === 0) return [];
      
      // Get the actual listings
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(
              name,
              label
            )
          )
        `)
        .in('id', listingResidencias.map(lr => lr.listing_id));
        
      if (listingsError) throw listingsError;
      
      // Get unique provider IDs from listings
      const providerIds = [...new Set(listingsData.map(listing => listing.provider_id))];
      
      // Fetch provider data from users table
      const { data: providers, error: providersError } = await supabase
        .from('users')
        .select('id, name')
        .in('id', providerIds)
        .eq('role', 'provider');
        
      if (providersError) throw providersError;
      
      // Create provider map for easy lookup
      const providerMap = Object.fromEntries(
        (providers || []).map(provider => [provider.id, provider])
      );
      
      return listingsData.map(listing => {
        const provider = providerMap[listing.provider_id];
        
        return {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          categoryId: listing.service_type?.category?.name || '',
          categoryName: listing.service_type?.category?.label || 'Otros',
          serviceTypeName: listing.service_type?.name || '',
          price: typeof listing.base_price === 'number' ? listing.base_price : 0,
          duration: typeof listing.duration === 'number' ? listing.duration : 0,
          providerId: listing.provider_id,
          providerName: provider?.name || 'Proveedor',
          residenciaIds: [residenciaId],
          createdAt: new Date(listing.created_at)
        };
      });
    }
  });

  // Group listings by category
  const listingsByCategory = React.useMemo(() => {
    const grouped: Record<string, typeof listings> = {};
    
    listings.forEach(listing => {
      const categoryId = listing.categoryId || 'other';
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(listing);
    });
    
    return grouped;
  }, [listings]);

  // Calculate final price with commission
  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * (1 + (commissionRate / 100));
  };

  const handleBookService = (serviceId: string) => {
    navigate(`/client/book/${residenciaId}/${serviceId}`);
  };

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  // Back button component
  const backButton = (
    <Button 
      variant="outline" 
      onClick={handleBack} 
      className="px-4 py-2 h-auto border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#FEEBCB]/50 hover:text-[#1A1A1A]"
    >
      <ArrowLeft size={16} className="mr-2" />
      <span>Volver</span>
    </Button>
  );

  if (isLoading) {
    return (
      <PageContainer
        title="Servicios Disponibles"
        subtitle={backButton}
        className="pt-1"
      >
        <div className="grid gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-[200px] rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Servicios Disponibles"
      subtitle={
        <div className="mt-2">
          {backButton}
        </div>
      }
      className="pt-1"
    >
      <div className="space-y-12">
        {Object.entries(listingsByCategory).map(([categoryId, categoryListings]) => {
          // Obtener la información de categoría o usar valores predeterminados
          const categoryInfo = SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES];
          const categoryLabel = categoryInfo?.label || 'Otros servicios';
          const categoryColor = categoryInfo?.color || '#1A1A1A';
          
          return (
            <section key={categoryId} className="space-y-6">
              <div className="flex items-center space-x-4">
                <h2 
                  className="text-2xl font-semibold" 
                  style={{ color: categoryColor }}
                >
                  {categoryLabel}
                </h2>
                <div className="h-[2px] flex-1" style={{ 
                  background: categoryColor,
                  opacity: 0.3 
                }} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryListings.map(listing => (
                  <Card 
                    key={listing.id} 
                    className="group hover:shadow-lg transition-all duration-300 border-t-4"
                    style={{ 
                      borderTopColor: categoryColor
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {listing.description}
                        </p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Duración</span>
                          <span className="font-medium">{String(listing.duration)} minutos</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Por: <span className="font-medium text-foreground">{listing.providerName}</span>
                          </div>
                          <div className="text-lg font-semibold">
                            ${calculateFinalPrice(listing.price ? Number(listing.price) : 0).toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 pt-2">
                          <Button
                            className="flex-1"
                            onClick={() => handleBookService(listing.id)}
                          >
                            Reservar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
        
        {listings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No hay servicios disponibles en esta residencia todavía.</p>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default ClientServices;

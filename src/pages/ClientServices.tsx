
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { MessageSquare } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/integrations/supabase/client';
import { useCommissionRate } from '@/hooks/useCommissionRate';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';

const ClientServices = () => {
  const { residenciaId } = useParams();
  const navigate = useNavigate();
  const { startNewConversation } = useChat();
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
          ),
          provider:provider_id(
            profile:id(
              name
            )
          )
        `)
        .in('id', listingResidencias.map(lr => lr.listing_id));
        
      if (listingsError) throw listingsError;
      
      return listingsData.map(listing => ({
        id: listing.id,
        title: listing.title,
        description: listing.description,
        categoryId: listing.service_type?.category?.name || '',
        categoryName: listing.service_type?.category?.label || 'Otros',
        serviceTypeName: listing.service_type?.name || '',
        price: listing.base_price,
        duration: listing.duration,
        providerId: listing.provider_id,
        providerName: listing.provider?.profile?.name || 'Proveedor',
        residenciaIds: [residenciaId],
        createdAt: new Date(listing.created_at)
      }));
    }
  });

  // Calculate final price with commission
  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * (1 + (commissionRate / 100));
  };

  const handleBookService = (serviceId: string) => {
    navigate(`/client/book/${residenciaId}/${serviceId}`);
  };

  const handleContactProvider = (providerId: string, providerName: string) => {
    startNewConversation(providerId, providerName);
    navigate('/client/messages');
  };

  if (isLoading) {
    return (
      <PageContainer
        title="Servicios Disponibles"
        subtitle="Explorando servicios disponibles..."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                  <div className="flex space-x-2 pt-2">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-10" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </PageContainer>
    );
  }

  // Group listings by category
  const listingsByCategory = listings.reduce((acc, listing) => {
    const categoryId = listing.categoryId || '';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(listing);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <PageContainer
      title="Servicios Disponibles"
      subtitle="Explora los servicios disponibles en tu residencia"
    >
      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay servicios disponibles en esta residencia todavía.</p>
        </div>
      ) : (
        Object.entries(listingsByCategory).map(([categoryId, categoryListings]) => (
          <div key={categoryId} className="mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.color || '#333' }}>
              {SERVICE_CATEGORIES[categoryId as keyof typeof SERVICE_CATEGORIES]?.label || 'Otros servicios'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryListings.map(listing => (
                <Card key={listing.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{listing.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Ofrecido por: {listing.providerName}
                        </p>
                        <p className="text-sm mb-2">{listing.description}</p>
                        <p className="text-sm font-semibold mb-4">${calculateFinalPrice(listing.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleBookService(listing.id)}
                      >
                        Reservar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleContactProvider(listing.providerId, listing.providerName)}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </PageContainer>
  );
};

export default ClientServices;

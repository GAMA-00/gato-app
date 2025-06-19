
import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Star, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Navbar from '@/components/layout/Navbar';

const ClientProvidersList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceType = searchParams.get('serviceType');

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['providers', serviceType],
    queryFn: async () => {
      let query = supabase
        .from('listings')
        .select(`
          *,
          users!listings_provider_id_fkey (
            id,
            name,
            avatar_url,
            average_rating
          )
        `);
      
      if (serviceType) {
        // First get service_type_id
        const { data: serviceTypeData } = await supabase
          .from('service_types')
          .select('id')
          .eq('name', serviceType)
          .single();
          
        if (serviceTypeData) {
          query = query.eq('service_type_id', serviceTypeData.id);
        }
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!serviceType,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Proveedores" subtitle="Cargando...">
          <div className="space-y-4">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 rounded-lg" />
              ))}
            </div>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer title="Proveedores" subtitle={`Servicio: ${serviceType}`}>
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((listing) => (
              <Card 
                key={listing.id}
                className="p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => navigate(`/client/service/${listing.id}`)}
              >
                <div className="flex items-center mb-4">
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={listing.users?.avatar_url} />
                    <AvatarFallback>
                      <User className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{listing.users?.name || 'Proveedor'}</h3>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm">
                        {listing.users?.average_rating?.toFixed(1) || 'Sin calificar'}
                      </span>
                    </div>
                  </div>
                </div>
                <h4 className="font-medium mb-2">{listing.title}</h4>
                <p className="text-muted-foreground text-sm mb-3">{listing.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">₡{listing.base_price}</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientProvidersList;

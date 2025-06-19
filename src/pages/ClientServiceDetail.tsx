
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const ClientServiceDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          users!listings_provider_id_fkey (
            id,
            name,
            avatar_url,
            average_rating,
            phone
          )
        `)
        .eq('id', serviceId)
        .single();
        
      if (error) throw error;
      
      // Ensure users data is valid
      if (!data.users || data.users === null || typeof data.users !== 'object' || !('id' in data.users)) {
        throw new Error('Invalid provider data');
      }
      
      return data as typeof data & { users: { id: string; name?: string; avatar_url?: string; average_rating?: number; phone?: string } };
    },
    enabled: !!serviceId,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Detalle del Servicio" subtitle="Cargando...">
          <div className="space-y-4">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </PageContainer>
      </>
    );
  }

  if (!service || !service.users) {
    return (
      <>
        <Navbar />
        <PageContainer title="Servicio no encontrado">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <p>El servicio que buscas no existe.</p>
        </PageContainer>
      </>
    );
  }

  // TypeScript now knows users is properly typed due to the query type assertion
  const userData = service.users;

  return (
    <>
      <Navbar />
      <PageContainer title={service.title} subtitle={`Por ${userData?.name || 'Proveedor'}`}>
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">{service.title}</h2>
                <p className="text-muted-foreground mb-4">{service.description}</p>
                <div className="space-y-2">
                  <p><strong>Precio:</strong> ₡{service.base_price}</p>
                  <p><strong>Duración:</strong> {service.duration} minutos</p>
                </div>
              </div>
              
              <div className="flex flex-col justify-center">
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => navigate(`/client/booking/${service.id}`)}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  Reservar Cita
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ClientServiceDetail;

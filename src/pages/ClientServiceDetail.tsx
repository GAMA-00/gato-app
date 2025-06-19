
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

interface ValidServiceUser {
  id: string;
  name?: string;
  avatar_url?: string;
  average_rating?: number;
  phone?: string;
}

interface ValidServiceData {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration: number;
  users: ValidServiceUser;
}

const ClientServiceDetail = () => {
  const { serviceId } = useParams();
  const navigate = useNavigate();

  const { data: service, isLoading } = useQuery({
    queryKey: ['service-detail', serviceId],
    queryFn: async (): Promise<ValidServiceData | null> => {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          base_price,
          duration,
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
      
      // Use more lenient type checking that matches Supabase query structure
      if (!data || !data.users || typeof data.users !== 'object') {
        throw new Error('Invalid provider data');
      }
      
      const userObj = data.users as any;
      if (!userObj.id || typeof userObj.id !== 'string') {
        throw new Error('Invalid provider data');
      }
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        base_price: data.base_price,
        duration: data.duration,
        users: {
          id: userObj.id,
          name: userObj.name || undefined,
          avatar_url: userObj.avatar_url || undefined,
          average_rating: userObj.average_rating || undefined,
          phone: userObj.phone || undefined
        }
      };
    },
    enabled: !!serviceId,
  });

  const handleBookingNavigation = () => {
    // Scroll to top before navigation
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    navigate(`/client/booking/${service.id}`);
  };

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

  if (!service) {
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

  const userData = service.users;

  return (
    <>
      <Navbar />
      <PageContainer title={service.title} subtitle={`Por ${userData.name || 'Proveedor'}`}>
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
                  onClick={handleBookingNavigation}
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

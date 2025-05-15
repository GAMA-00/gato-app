
import React, { useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import BookingSummaryCard from '@/components/client/results/BookingSummaryCard';
import ProvidersList from '@/components/client/results/ProvidersList';
import { useProvidersQuery } from '@/components/client/results/useProvidersQuery';
import { ProcessedProvider } from '@/components/client/results/types';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingPrefs = location.state || {};
  const { user } = useAuth();
  
  useEffect(() => {
    console.log("ClientResultsView rendered with params:", { categoryName, serviceId });
  }, [categoryName, serviceId]);
  
  // Obtener información de la residencia del cliente
  const { data: clientResidenciaInfo } = useQuery({
    queryKey: ['client-residencia-info', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('residencia_id, condominium_id, condominiums:condominium_id(name), residencias:residencia_id(name, address)')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      console.log("Client residencia info:", data);
      return data;
    },
    enabled: !!user?.id
  });
  
  // Obtenemos información del servicio para verificar que existe
  const { data: serviceInfo } = useQuery({
    queryKey: ['service-type-info', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('name, category_id')
        .eq('id', serviceId)
        .maybeSingle();
        
      if (error) {
        toast.error("Error al obtener información del servicio");
        throw error;
      }
      
      return data;
    },
    enabled: !!serviceId
  });
  
  // Use the custom hook to query providers
  const { data: providers = [], isLoading } = useProvidersQuery(serviceId || '', categoryName || '');
  
  // Log providers data for debugging
  useEffect(() => {
    console.log("Providers data:", providers);
  }, [providers]);
  
  const handleBack = () => {
    navigate(`/client/booking/${categoryName}/${serviceId}`);
  };
  
  const handleProviderSelect = (provider: ProcessedProvider) => {
    console.log("Selected provider:", provider);
    // Corregimos la navegación para usar la ruta correcta que muestra detalles del servicio
    navigate(`/client/service/${provider.id}/${provider.serviceId}`, {
      state: {
        bookingData: {
          ...bookingPrefs,
          serviceId: serviceId,
          categoryName: categoryName,
          providerId: provider.id,
          serviceListingId: provider.serviceId
        }
      }
    });
  };

  return (
    <PageContainer
      title="Profesionales disponibles"
      subtitle={
        <div className="flex items-center w-full">
          <Button 
            variant="outline"
            onClick={handleBack} 
            className="flex items-center text-[#1A1A1A] truncate px-4 py-2"
            size="sm"
          >
            <ArrowLeft size={16} className="mr-2 flex-shrink-0" />
            <span className="truncate">Volver a detalles de reserva</span>
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto">
        {/* Resumen de la reserva */}
        <BookingSummaryCard bookingPrefs={bookingPrefs} />
        
        {/* Lista de proveedores */}
        <ProvidersList 
          providers={providers}
          isLoading={isLoading}
          onProviderSelect={handleProviderSelect}
          onBack={handleBack}
        />
      </div>
    </PageContainer>
  );
};

export default ClientResultsView;

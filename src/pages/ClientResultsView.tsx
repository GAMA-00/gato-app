
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
        .from('clients')
        .select('residencia_id, residencias(name, address)')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) throw error;
      console.log("Client residencia info:", data);
      return data;
    },
    enabled: !!user?.id
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
    navigate(`/client/provider/${provider.id}`, {
      state: {
        bookingData: {
          ...bookingPrefs,
          serviceId: serviceId,
          categoryName: categoryName
        }
      }
    });
  };

  const residenciaName = clientResidenciaInfo?.residencias?.name || 'Todas las ubicaciones';

  return (
    <PageContainer
      title="Profesionales disponibles"
      subtitle={
        <div className="flex justify-between items-center w-full">
          <Button 
            variant="ghost" 
            onClick={handleBack} 
            className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" />
            <span>Volver a detalles de reserva</span>
          </Button>
          
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {residenciaName}
          </Badge>
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

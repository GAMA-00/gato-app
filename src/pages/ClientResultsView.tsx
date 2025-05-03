
import React from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import BookingSummaryCard from '@/components/client/results/BookingSummaryCard';
import ProvidersList from '@/components/client/results/ProvidersList';
import { useProvidersQuery } from '@/components/client/results/useProvidersQuery';
import { ProcessedProvider } from '@/components/client/results/types';

const ClientResultsView = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingPrefs = location.state || {};
  
  // Use the custom hook to query providers
  const { data: providers = [], isLoading } = useProvidersQuery(serviceId || '', categoryName || '');
  
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

  return (
    <PageContainer
      title="Profesionales disponibles"
      subtitle={
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="p-0 h-auto flex items-center text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Volver a detalles de reserva</span>
        </Button>
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

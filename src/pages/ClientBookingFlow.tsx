
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ClientBookingFlow = () => {
  const { categoryName, serviceId } = useParams<{ categoryName: string; serviceId: string }>();
  const navigate = useNavigate();
  
  console.log("ClientBookingFlow rendered with params:", { categoryName, serviceId });
  
  // Obtener información del servicio
  const { data: serviceInfo, isLoading } = useQuery({
    queryKey: ['service-info', serviceId],
    queryFn: async () => {
      if (!serviceId) return null;
      
      const { data, error } = await supabase
        .from('service_types')
        .select('*, category:category_id(name, label)')
        .eq('id', serviceId)
        .single();
        
      if (error) {
        console.error("Error fetching service info:", error);
        throw error;
      }
      
      console.log("Service info fetched:", data);
      return data;
    },
    enabled: !!serviceId
  });
  
  const handleBack = () => {
    navigate(`/client/category/${categoryName}`);
  };
  
  const handleShowResults = () => {
    console.log("Navigating to results with params:", { categoryName, serviceId });
    // Ya no pasamos bookingPrefs, solo navegamos directamente a los resultados
    navigate(`/client/results/${categoryName}/${serviceId}`);
  };
  
  return (
    <PageContainer
      title={serviceInfo?.name || 'Buscar profesionales'}
      subtitle={
        <Button 
          variant="outline" 
          onClick={handleBack} 
          className="px-4 py-2 h-auto border-luxury-navy/10 text-luxury-navy hover:bg-luxury-beige/50 hover:text-luxury-navy"
        >
          <ArrowLeft size={16} className="mr-2" />
          <span>Volver</span>
        </Button>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-soft border border-gray-100">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <ArrowRight className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">
            ¡Perfecto!
          </h2>
          <p className="text-gray-600">
            Ahora te mostraremos todos los profesionales disponibles para el servicio de{' '}
            <span className="font-medium text-primary">{serviceInfo?.name}</span>
          </p>
        </div>
        
        <div className="pt-6 border-t border-gray-100">
          <Button 
            onClick={handleShowResults} 
            className="w-full h-12 text-base font-medium rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200"
          >
            <span>Ver profesionales disponibles</span>
            <ArrowRight className="ml-3 h-4 w-4" />
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};

export default ClientBookingFlow;

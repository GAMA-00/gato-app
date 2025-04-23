
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { Service } from '@/lib/types';
import { MessageSquare } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { supabase } from '@/lib/supabase';
import { useCommissionRate } from '@/hooks/useCommissionRate';
import { useQuery } from '@tanstack/react-query';

// Define an interface for the service data returned from Supabase
interface ServiceData {
  id: string;
  name: string;
  description: string;
  category: string;
  base_price: number;
  building_id: string;
  provider_id: string;
  profiles: {
    name: string;
  };
}

const ClientServices = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { startNewConversation } = useChat();
  const { commissionRate } = useCommissionRate();
  
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select(`
          *,
          profiles:provider_id (
            name
          )
        `)
        .eq('building_id', buildingId);

      if (error) throw error;
      
      // Ensure data is not null before mapping
      if (!data) return [];

      // Now TypeScript knows data is an array of ServiceData
      return data.map((service: ServiceData) => ({
        ...service,
        providerName: service.profiles.name,
        price: service.base_price,
        buildingIds: [service.building_id],
      }));
    },
  });

  // Calculate final price with commission
  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * (1 + (commissionRate / 100));
  };

  const handleBookService = (serviceId: string) => {
    navigate(`/client/book/${buildingId}/${serviceId}`);
  };

  const handleContactProvider = (providerId: string, providerName: string) => {
    startNewConversation(providerId, providerName);
    navigate('/client/messages');
  };

  return (
    <PageContainer
      title="Servicios Disponibles"
      subtitle="Explora los servicios disponibles en tu edificio"
    >
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando servicios...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay servicios disponibles en este edificio todavía.</p>
        </div>
      ) : (
        Object.entries(services.reduce((acc, service) => {
          if (!acc[service.category]) {
            acc[service.category] = [];
          }
          acc[service.category].push(service);
          return acc;
        }, {} as Record<string, any[]>)).map(([category, categoryServices]) => (
          <div key={category} className="mb-8">
            <h2 className="text-xl font-semibold mb-4" style={{ color: SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.color }}>
              {SERVICE_CATEGORIES[category as keyof typeof SERVICE_CATEGORIES]?.label || category}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryServices.map(service => (
                <Card key={service.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{service.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Ofrecido por: {service.providerName}
                        </p>
                        <p className="text-sm mb-2">{service.description}</p>
                        <p className="text-sm font-semibold mb-4">${calculateFinalPrice(service.price).toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        className="flex-1"
                        onClick={() => handleBookService(service.id)}
                      >
                        Reservar
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleContactProvider(service.provider_id, service.providerName)}
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

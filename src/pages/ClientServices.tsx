
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
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { startNewConversation } = useChat();
  const { commissionRate } = useCommissionRate();
  
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['client-services', buildingId],
    queryFn: async () => {
      // Query services and related building associations
      const { data: buildingServices, error: bsError } = await supabase
        .from('building_services')
        .select('service_id')
        .eq('building_id', buildingId);
        
      if (bsError) throw bsError;
      
      // If no services for this building, return empty array
      if (!buildingServices.length) return [];
      
      // Get the actual services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          *,
          profiles:provider_id (
            name
          )
        `)
        .in('id', buildingServices.map(bs => bs.service_id));
        
      if (servicesError) throw servicesError;
      
      return servicesData.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category,
        price: service.base_price,
        duration: service.duration,
        providerId: service.provider_id,
        providerName: service.profiles?.name || 'Proveedor',
        buildingIds: [buildingId],
        createdAt: new Date(service.created_at)
      }));
    }
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

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <PageContainer
      title="Servicios Disponibles"
      subtitle="Explora los servicios disponibles en tu edificio"
    >
      {services.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay servicios disponibles en este edificio todavía.</p>
        </div>
      ) : (
        Object.entries(servicesByCategory).map(([category, categoryServices]) => (
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
                        onClick={() => handleContactProvider(service.providerId, service.providerName)}
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

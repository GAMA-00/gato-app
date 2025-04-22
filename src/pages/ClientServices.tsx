
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SERVICE_CATEGORIES } from '@/lib/data';
import { Service } from '@/lib/types';
import { MessageSquare } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';

const ClientServices = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { startNewConversation } = useChat();
  const [services, setServices] = useState<Service[]>([]);
  
  // Load services from localStorage
  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices, (key, value) => {
          if (key === 'createdAt') {
            return new Date(value);
          }
          return value;
        });
        setServices(parsedServices);
      } catch (error) {
        console.error('Error parsing services:', error);
      }
    }
  }, []);

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    // Check if this service is available in the selected building
    if (!service.buildingIds.includes(buildingId || '')) return acc;
    
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

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
      {Object.keys(servicesByCategory).length === 0 ? (
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
                        <p className="text-sm font-semibold mb-4">${service.price.toFixed(2)}</p>
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

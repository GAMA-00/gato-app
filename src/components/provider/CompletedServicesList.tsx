import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, User, Calendar } from 'lucide-react';
import { usePostPaymentServices } from '@/hooks/usePostPaymentServices';
import PostPaymentPricing from './PostPaymentPricing';

interface CompletedServicesListProps {
  providerId: string;
}

const CompletedServicesList: React.FC<CompletedServicesListProps> = ({ providerId }) => {
  const { data: completedServices, isLoading, refetch } = usePostPaymentServices(providerId);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);

  const handleSetPrice = (appointment: any) => {
    setSelectedAppointment(appointment);
    setIsPricingModalOpen(true);
  };

  const handlePricingSuccess = () => {
    refetch();
    setSelectedAppointment(null);
    setIsPricingModalOpen(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Servicios Pendientes de Precio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Cargando servicios...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!completedServices || completedServices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Servicios Pendientes de Precio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay servicios pendientes de definir precio final.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Servicios Pendientes de Precio
            <Badge variant="destructive" className="ml-2">
              {completedServices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {completedServices.map((service) => (
              <Card key={service.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{service.client_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {service.service_name}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(service.start_time)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(service.start_time)} - {formatTime(service.end_time)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        Pendiente precio
                      </Badge>
                      <Button
                        size="sm"
                        onClick={() => handleSetPrice(service)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Definir precio
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAppointment && (
        <PostPaymentPricing
          isOpen={isPricingModalOpen}
          onClose={() => {
            setIsPricingModalOpen(false);
            setSelectedAppointment(null);
          }}
          appointment={selectedAppointment}
          onSuccess={handlePricingSuccess}
        />
      )}
    </>
  );
};

export default CompletedServicesList;
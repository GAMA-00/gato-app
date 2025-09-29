import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, ChevronRight, Calendar, DollarSign } from 'lucide-react';
import { useCompletedServices } from '@/hooks/useCompletedServices';
import { formatCurrency } from '@/utils/currencyUtils';

interface CompletedServicesSectionProps {
  userType: 'client' | 'provider';
}

export const CompletedServicesSection: React.FC<CompletedServicesSectionProps> = ({ userType }) => {
  const [showAll, setShowAll] = useState(false);
  const { data: completedServices = [], isLoading, error } = useCompletedServices(
    userType, 
    showAll ? undefined : 3
  );

  const formatDate = (dateString: string) => {
    const formatted = new Date(dateString).toLocaleDateString('es-CR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  };

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Error al cargar el historial de servicios
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Servicios Completados</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Historial de servicios finalizados con transacciones completadas
      </p>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : completedServices.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No hay servicios completados aún
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {completedServices.map((service) => (
              <Card key={service.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium">{service.service_name}</h3>
                        <Badge 
                          variant={service.payment_type === 'prepaid' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {service.payment_type === 'prepaid' ? 'Pre-pago' : 'Post-pago'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(service.service_date)}</span>
                        </div>
                        
                        {userType === 'client' && service.provider_name && (
                          <span>Proveedor: {service.provider_name}</span>
                        )}
                        
                        {userType === 'provider' && service.client_name && (
                          <span>Cliente: {service.client_name}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm font-medium text-primary">
                        <DollarSign className="h-4 w-4" />
                        <span>{formatCurrency(service.final_price)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!showAll && completedServices.length >= 3 && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setShowAll(true)}
                className="gap-2"
              >
                Ver historial completo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {showAll && (
            <div className="text-center">
              <Button
                variant="ghost"
                onClick={() => setShowAll(false)}
                className="text-sm"
              >
                Mostrar menos
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
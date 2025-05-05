
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Edit } from 'lucide-react';
import { Service } from '@/lib/types';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit }) => {
  // Mostrar hasta 3 variantes o servicios como máximo
  const variantsToShow = service.serviceVariants && service.serviceVariants.length > 0 
    ? service.serviceVariants.slice(0, 3) 
    : [];
  
  const hasMoreVariants = service.serviceVariants && service.serviceVariants.length > 3;
  
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
        
        {variantsToShow.length > 0 ? (
          <div className="space-y-3 mb-2">
            {variantsToShow.map((variant, index) => (
              <div key={variant.id || index} className="bg-muted/40 p-2 rounded-md">
                <p className="font-medium text-sm">{variant.name}</p>
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{variant.duration} min</span>
                  </div>
                  <div className="flex items-center">
                    <DollarSign className="h-3 w-3 mr-1" />
                    <span>${Number(variant.price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {hasMoreVariants && (
              <p className="text-xs text-center text-muted-foreground">
                + {service.serviceVariants!.length - 3} servicios más
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{service.duration} minutos</span>
            </div>
            <div className="flex items-center text-sm">
              <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>${service.price.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="bg-muted/20 px-6 py-4">
        <Button 
          variant="outline" 
          onClick={() => onEdit(service)}
          className="w-full"
        >
          <Edit className="mr-2 h-4 w-4" />
          Editar Anuncio
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ServiceCard;

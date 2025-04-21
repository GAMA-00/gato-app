
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Edit } from 'lucide-react';
import { Service } from '@/lib/types';
import { SERVICE_CATEGORIES } from '@/lib/data';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, onEdit }) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
        <p className="text-muted-foreground text-sm mb-4">{service.description}</p>
        
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

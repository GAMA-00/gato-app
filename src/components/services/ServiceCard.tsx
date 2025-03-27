
import React from 'react';
import { Clock, DollarSign, Edit, Trash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Service } from '@/lib/types';
import { SERVICE_CATEGORIES } from '@/lib/data';

interface ServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  service,
  onEdit,
  onDelete
}) => {
  const category = SERVICE_CATEGORIES[service.category];
  
  return (
    <Card className="glassmorphism overflow-hidden group transition-all duration-300 hover:shadow-medium">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <span style={{ color: category.color }} className="font-medium text-sm">
              {service.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">{service.name}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {service.duration} min
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> ${service.price}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => onEdit(service)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(service)}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div 
              className="text-xs px-2 py-1 rounded-full inline-block mt-2"
              style={{ 
                backgroundColor: `${category.color}15`,
                color: category.color
              }}
            >
              {category.label}
            </div>
            
            {service.description && (
              <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                {service.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;

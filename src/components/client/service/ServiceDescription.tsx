
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ServiceTypeData } from './types';

interface ServiceDescriptionProps {
  description: string;
  serviceType: ServiceTypeData;
}

const ServiceDescription = ({ description, serviceType }: ServiceDescriptionProps) => {
  const category = serviceType.category || { name: '' };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Descripción del servicio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <Badge>{category.name}</Badge>
          <Badge variant="outline">{serviceType.name}</Badge>
        </div>
        <p className="text-muted-foreground whitespace-pre-line">{description}</p>
      </CardContent>
    </Card>
  );
};

export default ServiceDescription;

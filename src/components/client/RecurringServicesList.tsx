
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import RecurringServicesIndicator from './RecurringServicesIndicator';
import { Service } from '@/lib/types';

interface RecurringServicesListProps {
  services: Service[];
}

const RecurringServicesList = ({ services }: RecurringServicesListProps) => {
  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Mis Servicios Recurrentes</h3>
        <RecurringServicesIndicator count={services.length} />
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border">
        <div className="flex w-full space-x-4 p-4">
          {services.map((service) => (
            <Card key={service.id} className="w-[300px] shrink-0">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{service.name}</span>
                  <span className="text-sm text-muted-foreground">${service.price.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">{service.description}</div>
                <div className="text-xs mt-2">Ofrecido por: <span className="font-semibold">{service.providerName}</span></div>
              </CardContent>
            </Card>
          ))}
          {services.length === 0 && (
            <div className="py-12 text-center text-muted-foreground w-full">
              No tienes servicios recurrentes
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RecurringServicesList;

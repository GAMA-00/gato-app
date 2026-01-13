
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { formatCurrency, type CurrencyCode } from '@/utils/currencyUtils';

interface PriceInformationProps {
  basePrice: number;
  duration: number;
  currency?: CurrencyCode;
}

const PriceInformation = ({ basePrice, duration, currency = 'USD' }: PriceInformationProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Información de precio</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Precio base</span>
            <span>{formatCurrency(basePrice, currency)}/servicio</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duración estándar</span>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span>
                {Math.floor(duration / 60) > 0 ? `${Math.floor(duration / 60)}h ` : ''}
                {duration % 60 > 0 ? `${duration % 60}min` : ''}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceInformation;

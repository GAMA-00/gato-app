import React from 'react';
import { formatCurrency } from '@/lib/utils';

interface ServicePriceProps {
  price: number;
  additionalPersonPrice?: number;
  layout?: 'mobile' | 'desktop';
  alignment?: 'left' | 'center';
  className?: string;
}

const ServicePrice = ({ 
  price, 
  additionalPersonPrice, 
  layout = 'desktop',
  alignment = 'left',
  className = ''
}: ServicePriceProps) => {
  const formatPriceWithoutDecimals = (price: number) => {
    return price % 1 === 0 ? `$${price}` : formatCurrency(price);
  };

  const hasPersonPricing = additionalPersonPrice && Number(additionalPersonPrice) > 0;
  const isMobile = layout === 'mobile';
  const alignmentClass = alignment === 'center' ? 'items-center text-center' : 'items-start text-left';

  return (
    <div className={`flex flex-col ${alignmentClass} ${className}`}>
      <div className="font-medium">{formatPriceWithoutDecimals(Number(price))}</div>
      {hasPersonPricing && (
        <div className="text-xs text-muted-foreground mt-1">
          +{formatPriceWithoutDecimals(Number(additionalPersonPrice))} {isMobile ? 'pp' : 'por persona'}
        </div>
      )}
    </div>
  );
};

export default ServicePrice;
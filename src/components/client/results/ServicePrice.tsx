import React from 'react';
import { formatCurrency, getCurrencySymbol, type CurrencyCode } from '@/utils/currencyUtils';

interface ServicePriceProps {
  price: number;
  additionalPersonPrice?: number;
  layout?: 'mobile' | 'desktop';
  alignment?: 'left' | 'center';
  className?: string;
  currency?: CurrencyCode;
}

const ServicePrice = ({ 
  price, 
  additionalPersonPrice, 
  layout = 'desktop',
  alignment = 'left',
  className = '',
  currency = 'USD'
}: ServicePriceProps) => {
  const formatPriceWithoutDecimals = (price: number) => {
    const symbol = getCurrencySymbol(currency);
    const locale = currency === 'CRC' ? 'es-CR' : 'en-US';
    return price % 1 === 0 ? `${symbol}${price.toLocaleString(locale)}` : formatCurrency(price, currency);
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
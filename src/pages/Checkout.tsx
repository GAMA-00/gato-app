import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SimplifiedCheckoutForm } from '@/components/payments/SimplifiedCheckoutForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, type CurrencyCode } from '@/utils/currencyUtils';
import { toast } from '@/hooks/use-toast';
import { ProgressIndicator } from '@/components/checkout/ProgressIndicator';
import { ScrollIndicator } from '@/components/checkout/ScrollIndicator';
import { logger } from '@/utils/logger';

interface CheckoutData {
  serviceTitle: string;
  providerName: string;
  selectedVariants: any[];
  clientLocation: string;
  bookingData: any;
  totalPrice: number;
  currency?: CurrencyCode;
}

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const checkoutData = location.state as CheckoutData;

  useEffect(() => {
    if (!checkoutData || !user) {
      navigate('/client/categories');
    }
  }, [checkoutData, user, navigate]);

  // Scroll to top when page loads - enhanced implementation
  useEffect(() => {
    // Use setTimeout to ensure DOM is fully rendered
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    
    // Execute immediately
    scrollToTop();
    
    // Also execute after a small delay to ensure it works
    const timeoutId = setTimeout(scrollToTop, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  if (!checkoutData || !user) {
    return null;
  }

  const {
    serviceTitle,
    providerName,
    selectedVariants,
    clientLocation,
    bookingData,
    totalPrice,
    currency = 'USD'
  } = checkoutData;

  // Calculate price breakdown with correct IVA (13%)
  const calculatePriceBreakdown = (subtotalPrice: number) => {
    const subtotal = subtotalPrice;
    const iva = subtotal * 0.13;
    const total = subtotal + iva;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      iva: Math.round(iva * 100) / 100,
      total: Math.round(total * 100) / 100
    };
  };

  const serviceSubtotal = selectedVariants.reduce((sum, variant) => 
    sum + (Number(variant.price) * variant.quantity), 0
  );

  const priceBreakdown = calculatePriceBreakdown(serviceSubtotal);

  const handlePaymentSuccess = (result: any) => {
    // Use the real UUID from the database (prioritize 'id' over 'payment_id')
    const paymentId = result.id || result.payment_id;
    navigate(`/payment-status/${paymentId}`);
  };

  const handlePaymentError = (error: Error) => {
    logger.error('Payment error:', error);
    
    // Don't show additional error for service unavailability - already handled in form
    if (error.message === "SERVICE_TEMPORARILY_UNAVAILABLE") {
      return;
    }
    
    // For other errors, show general error message
    toast({
      variant: "destructive", 
      title: "Error en el pago",
      description: "Hubo un problema procesando su pago. Por favor, intente nuevamente."
    });
  };

  // Detectar automáticamente el tipo de pago según la frecuencia
  const isRecurringService = bookingData.recurrenceType && bookingData.recurrenceType !== 'once';
  const paymentType = isRecurringService ? 'subscription' : 'cash';

  return (
    <div className="checkout-container h-screen overflow-y-auto snap-y snap-mandatory">
      {/* SECCIÓN 1: RESUMEN DE PAGO (100vh) */}
      <section className="snap-start min-h-screen flex flex-col justify-between p-6 bg-background">
        <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col">
          <ProgressIndicator step={1} />
          
          {/* Service Summary Card - Compacto */}
          <Card className="mb-4">
            <CardContent className="pt-6 space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{serviceTitle}</h3>
                <p className="text-sm text-muted-foreground">Proveedor: {providerName}</p>
              </div>
            </CardContent>
          </Card>

          {/* Price Breakdown Card - Principal */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Desglose de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Services List */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Servicios:</h4>
                {selectedVariants.map((variant, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{variant.name}</p>
                      {variant.quantity > 1 && (
                        <p className="text-sm text-muted-foreground">Cantidad: {variant.quantity}</p>
                      )}
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(variant.price) * variant.quantity, currency)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Price Summary */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(priceBreakdown.subtotal, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">IVA (13%):</span>
                  <span className="font-medium">{formatCurrency(priceBreakdown.iva, currency)}</span>
                </div>
                <Separator className="my-3" />
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">TOTAL:</span>
                  <span className="text-3xl font-bold text-success">
                    {formatCurrency(priceBreakdown.total, currency)}
                  </span>
                </div>
              </div>

              {isRecurringService && (
                <div className="bg-blue-50 p-3 rounded-lg mt-4">
                  <p className="text-sm text-blue-700">
                    <strong>Servicio Recurrente:</strong> Este pago se procesará automáticamente según la frecuencia seleccionada ({
                      bookingData.recurrenceType === 'daily' ? 'Diaria' :
                      bookingData.recurrenceType === 'weekly' ? 'Semanal' :
                      bookingData.recurrenceType === 'biweekly' ? 'Quincenal' :
                      bookingData.recurrenceType === 'triweekly' ? 'Trisemanal' :
                      bookingData.recurrenceType === 'monthly' ? 'Mensual' :
                      bookingData.recurrenceType
                    }).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-6">
          <ScrollIndicator />
        </div>
      </section>

      {/* SECCIÓN 2: MÉTODO DE PAGO (100vh) */}
      <section className="snap-start min-h-screen flex flex-col p-6 bg-background">
        <div className="max-w-2xl mx-auto w-full flex-1">
          <ProgressIndicator step={2} />
          
          {/* Payment Form */}
          <SimplifiedCheckoutForm
            amount={priceBreakdown.total}
            currency={currency}
            paymentType={paymentType}
            appointmentData={bookingData}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </section>
    </div>
  );
};
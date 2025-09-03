import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PaymentMethodSelector } from '@/components/payments/PaymentMethodSelector';
import { OnvopayCheckoutForm } from '@/components/payments/OnvopayCheckoutForm';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';

interface CheckoutData {
  serviceTitle: string;
  providerName: string;
  selectedVariants: any[];
  selectedDate: Date;
  selectedTime: string;
  clientLocation: string;
  bookingData: any;
  totalPrice: number;
}

export const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'subscription' | null>(null);

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
    selectedDate,
    selectedTime,
    clientLocation,
    bookingData,
    totalPrice
  } = checkoutData;

  const totalDuration = selectedVariants.reduce((sum, variant) => 
    sum + (Number(variant.duration) * variant.quantity), 0
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${mins > 0 ? `h ${mins}m` : 'h'}`;
  };

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
    const paymentId = result.payment_id || result.id;
    navigate(`/payment-status/${paymentId}`);
  };

  const handlePaymentError = (error: Error) => {
    console.error('Payment error:', error);
  };

  const serviceType = bookingData.recurrenceType === 'once' ? 'one-time' : 'recurring';

  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Regresar
          </Button>
          <h1 className="text-2xl font-bold">Confirmar y Pagar</h1>
          <p className="text-muted-foreground">
            Revisa tu reserva y completa el pago
          </p>
        </div>

        <div className="space-y-6">
          {/* Service and Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Service Info */}
              <div>
                <h3 className="font-semibold text-lg">{serviceTitle}</h3>
                <p className="text-muted-foreground">Proveedor: {providerName}</p>
              </div>

              <Separator />

              {/* Services List */}
              <div className="space-y-3">
                <h4 className="font-medium">Servicios seleccionados:</h4>
                {selectedVariants.map((variant, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{variant.name}</p>
                      {variant.quantity > 1 && (
                        <p className="text-sm text-muted-foreground">Cantidad: {variant.quantity}</p>
                      )}
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(Number(variant.price) * variant.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Duration */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Duración:</span>
                <span className="font-medium">{formatDuration(totalDuration)}</span>
              </div>

              <Separator />

              {/* Price Breakdown */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(priceBreakdown.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">IVA (13%):</span>
                  <span className="font-medium">{formatCurrency(priceBreakdown.iva)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(priceBreakdown.total)}</span>
                </div>
              </div>

              {bookingData.recurrenceType !== 'once' && (
                <div className="bg-blue-50 p-3 rounded-lg mt-4">
                  <p className="text-sm text-blue-700">
                    Este es un servicio recurrente. El pago se procesará automáticamente según la frecuencia seleccionada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <PaymentMethodSelector
            serviceType={serviceType}
            onMethodSelect={setPaymentMethod}
          />

          {/* Payment Form */}
          {paymentMethod && (
            <OnvopayCheckoutForm
              amount={priceBreakdown.total}
              paymentType={paymentMethod}
              appointmentData={bookingData}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          )}
        </div>
      </div>
    </PageLayout>
  );
};
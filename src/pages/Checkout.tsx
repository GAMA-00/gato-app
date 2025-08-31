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
import { ArrowLeft, Clock, Calendar } from 'lucide-react';
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('es-CR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const totalDuration = selectedVariants.reduce((sum, variant) => 
    sum + (Number(variant.duration) * variant.quantity), 0
  );

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}${mins > 0 ? `h ${mins}m` : 'h'}`;
  };

  const handlePaymentSuccess = (paymentId: string) => {
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de tu Reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{serviceTitle}</h3>
                <p className="text-muted-foreground">Proveedor: {providerName}</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatTime(selectedTime)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Duración: </span>
                  <span>{formatDuration(totalDuration)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Ubicación: </span>
                  <span>{clientLocation}</span>
                </div>
              </div>

              <Separator />

              {/* Services */}
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
                      ${formatCurrency(Number(variant.price) * variant.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total a pagar:</span>
                <span>${formatCurrency(totalPrice)}</span>
              </div>

              {bookingData.recurrenceType !== 'once' && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    Este es un servicio recurrente. El pago se procesará automáticamente según la frecuencia seleccionada.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Section */}
          <div className="space-y-6">
            <PaymentMethodSelector
              serviceType={serviceType}
              onMethodSelect={setPaymentMethod}
            />

            {paymentMethod && (
              <OnvopayCheckoutForm
                amount={totalPrice}
                paymentType={paymentMethod}
                appointmentData={bookingData}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
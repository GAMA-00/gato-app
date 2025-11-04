import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, CheckCircle2, Calendar, CreditCard, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const RECURRENCE_LABELS: Record<string, string> = {
  'weekly': 'Semanal',
  'biweekly': 'Quincenal',
  'triweekly': 'Cada 3 semanas',
  'monthly': 'Mensual'
};

export const RecurringBookingConfirmation = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      navigate('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch appointment details
        const { data: appointment, error: aptError } = await supabase
          .from('appointments')
          .select('*, listings(name, price)')
          .eq('id', appointmentId)
          .single();

        if (aptError || !appointment) {
          console.error('Error fetching appointment:', aptError);
          navigate('/dashboard');
          return;
        }

        setAppointmentData(appointment);

        // Fetch subscription details if exists
        const { data: subscription } = await supabase
          .from('onvopay_subscriptions')
          .select('*')
          .eq('external_reference', appointmentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        setSubscriptionData(subscription);
      } catch (error) {
        console.error('Error loading booking confirmation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [appointmentId, navigate]);

  if (loading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto py-8 px-4">
          <div className="text-center">Cargando...</div>
        </div>
      </PageLayout>
    );
  }

  if (!appointmentData) {
    return null;
  }

  const firstChargeDate = appointmentData.start_time 
    ? format(new Date(appointmentData.start_time), "d 'de' MMMM 'de' yyyy", { locale: es })
    : '';

  const recurrenceLabel = RECURRENCE_LABELS[appointmentData.recurrence] || appointmentData.recurrence;
  const amount = subscriptionData?.amount || appointmentData.listings?.price || 0;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/client/bookings')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Ver Mis Reservas
          </Button>
        </div>
        
        {/* Success Message with Green Checkmark */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 mb-8">
          <div className="flex flex-col items-center text-center gap-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold text-green-900 mb-2">
                ¡Suscripción Activa!
              </h1>
              <p className="text-green-800 text-lg">
                Tu cobro inicial fue procesado exitosamente.
              </p>
            </div>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Detalles de tu Suscripción</h2>
          
          <div className="space-y-4">
            {/* Service Name */}
            {appointmentData.listings?.name && (
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Repeat className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Servicio</p>
                  <p className="font-medium">{appointmentData.listings.name}</p>
                </div>
              </div>
            )}

            {/* First Service Date */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primera Fecha del Servicio</p>
                <p className="font-medium">{firstChargeDate}</p>
              </div>
            </div>

            {/* Frequency */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Repeat className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frecuencia</p>
                <p className="font-medium">{recurrenceLabel}</p>
              </div>
            </div>

            {/* Amount per Service */}
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto por Servicio</p>
                <p className="font-medium text-lg text-green-600">${amount.toFixed(2)} USD</p>
              </div>
            </div>
          </div>

          {/* Payment Note */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-green-900">
                  <strong>✅ Cobro inicial completado:</strong> Tu primer pago de <strong>${amount.toFixed(2)} USD</strong> fue procesado exitosamente.
                </p>
                <p className="text-sm text-green-800 mt-2">
                  Los próximos cobros se realizarán automáticamente cada <strong>{recurrenceLabel.toLowerCase()}</strong> según la frecuencia configurada.
                </p>
                {subscriptionData?.card_last4 && (
                  <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    Tarjeta guardada: •••• {subscriptionData.card_last4}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 text-center">
          <Button 
            size="lg"
            onClick={() => navigate('/client/bookings')}
            className="w-full sm:w-auto"
          >
            Ver Mis Reservas
          </Button>
        </div>
      </div>
    </PageLayout>
  );
};

import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, DollarSign, CreditCard, Clock, MapPin } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const TIMEZONE = 'America/Costa_Rica';

export default function AppointmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['admin-appointment-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: payment } = useQuery({
    queryKey: ['admin-appointment-payment', appointment?.onvopay_payment_id],
    queryFn: async () => {
      if (!appointment?.onvopay_payment_id) return null;
      
      const { data, error } = await supabase
        .from('onvopay_payments')
        .select('*')
        .eq('id', appointment.onvopay_payment_id)
        .single();

      if (error) {
        console.error('Error fetching payment:', error);
        return null;
      }
      return data;
    },
    enabled: !!appointment?.onvopay_payment_id,
  });

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('commission_rate')
        .single();

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Cargando detalles de la cita...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-muted-foreground">Cita no encontrada</div>
        <Button onClick={() => navigate('/admin/appointments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a citas
        </Button>
      </div>
    );
  }

  const date = formatInTimeZone(new Date(appointment.start_time), TIMEZONE, 'dd/MM/yyyy');
  const startTime = formatInTimeZone(new Date(appointment.start_time), TIMEZONE, 'HH:mm');
  const endTime = formatInTimeZone(new Date(appointment.end_time), TIMEZONE, 'HH:mm');

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendiente', variant: 'secondary' },
    confirmed: { label: 'Confirmada', variant: 'default' },
    completed: { label: 'Completada', variant: 'outline' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
    rejected: { label: 'Rechazada', variant: 'destructive' },
  };

  const statusInfo = statusLabels[appointment.status] || { label: appointment.status, variant: 'outline' };

  // Cálculos financieros
  const finalPrice = appointment.final_price ? parseFloat(appointment.final_price.toString()) : 0;
  const commissionRate = systemSettings?.commission_rate || 20;
  const commission = (finalPrice * commissionRate) / 100;
  const providerEarnings = finalPrice - commission;

  // Información del pago de Onvopay
  const paymentAmount = payment?.amount ? parseFloat(payment.amount.toString()) : 0;
  const paymentSubtotal = payment?.subtotal ? parseFloat(payment.subtotal.toString()) : 0;
  const paymentIVA = payment?.iva_amount ? parseFloat(payment.iva_amount.toString()) : 0;
  const paymentCommission = payment?.commission_amount ? parseFloat(payment.commission_amount.toString()) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/admin/appointments')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a citas
        </Button>
        <Badge variant={statusInfo.variant} className="text-base px-4 py-1">
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Información de la Cita
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">ID de Cita</div>
              <div className="font-mono text-sm">{appointment.id}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground">Fecha y Hora</div>
              <div className="font-medium">{date}</div>
              <div className="text-sm text-muted-foreground">{startTime} - {endTime}</div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Cliente</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{appointment.client_name || '—'}</span>
              </div>
              {appointment.client_email && (
                <div className="text-sm text-muted-foreground ml-6">{appointment.client_email}</div>
              )}
              {appointment.client_phone && (
                <div className="text-sm text-muted-foreground ml-6">{appointment.client_phone}</div>
              )}
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Proveedor</div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{appointment.provider_name || '—'}</span>
              </div>
            </div>
            {appointment.client_address && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Dirección</div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <span className="text-sm">{appointment.client_address}</span>
                  </div>
                </div>
              </>
            )}
            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Notas</div>
                  <div className="text-sm">{appointment.notes}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Información financiera */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Información Financiera
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {finalPrice > 0 ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio Final</span>
                    <span className="font-semibold text-lg">${finalPrice.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Comisión Plataforma ({commissionRate}%)</span>
                    <span className="font-medium text-destructive">-${commission.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ganancia Proveedor</span>
                    <span className="font-medium text-green-600">${providerEarnings.toFixed(2)}</span>
                  </div>
                </div>

                {payment && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Desglose del Pago (Onvopay)
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>${paymentSubtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">IVA</span>
                          <span>${paymentIVA.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Comisión</span>
                          <span>${paymentCommission.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total Pagado</span>
                          <span>${paymentAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <div className="text-sm font-semibold mb-2">IDs de Onvopay</div>
                      <div className="space-y-1 text-xs">
                        {payment.onvopay_payment_id && (
                          <div>
                            <span className="text-muted-foreground">Payment ID: </span>
                            <span className="font-mono">{payment.onvopay_payment_id}</span>
                          </div>
                        )}
                        {payment.onvopay_transaction_id && (
                          <div>
                            <span className="text-muted-foreground">Transaction ID: </span>
                            <span className="font-mono">{payment.onvopay_transaction_id}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Estado: </span>
                          <Badge variant="outline" className="text-xs">
                            {payment.status}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Método: </span>
                          <span>{payment.payment_method}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Sin información de precio</p>
                <p className="text-sm">El precio aún no ha sido finalizado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Detalles Adicionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm text-muted-foreground">Recurrencia</div>
              <div className="font-medium">{appointment.recurrence === 'none' ? 'Única' : appointment.recurrence}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Creado</div>
              <div className="font-medium">
                {formatInTimeZone(new Date(appointment.created_at), TIMEZONE, 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
            {appointment.last_modified_at && (
              <div>
                <div className="text-sm text-muted-foreground">Última modificación</div>
                <div className="font-medium">
                  {formatInTimeZone(new Date(appointment.last_modified_at), TIMEZONE, 'dd/MM/yyyy HH:mm')}
                </div>
              </div>
            )}
          </div>
          {appointment.admin_notes && (
            <div className="mt-4">
              <div className="text-sm text-muted-foreground mb-2">Notas del Admin</div>
              <div className="text-sm bg-muted p-3 rounded-md">{appointment.admin_notes}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

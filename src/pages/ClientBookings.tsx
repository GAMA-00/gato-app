
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, RotateCcw, X, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import ClientPageLayout from '@/components/layout/ClientPageLayout';
import { useClientAppointments, ClientAppointment } from '@/hooks/useClientAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente de aprobación',
    className: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  },
  confirmed: {
    label: 'Confirmada',
    className: 'bg-green-50 text-green-700 border border-green-200',
  },
  rejected: {
    label: 'Rechazada',
    className: 'bg-red-50 text-red-700 border border-red-200',
  },
  cancelled: {
    label: 'Cancelada',
    className: 'bg-gray-50 text-gray-600 border border-gray-200',
  },
  completed: {
    label: 'Completada',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
};

function AppointmentCard({ appt }: { appt: ClientAppointment }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const statusCfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
  const isActionable = appt.status === 'pending' || appt.status === 'confirmed';

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const { error } = await db
        .from('appointments')
        .update({ status: 'cancelled', cancellation_time: new Date().toISOString() })
        .eq('id', appt.id);
      if (error) throw error;
      toast.success('Cita cancelada');
      queryClient.invalidateQueries({ queryKey: ['client-appointments-direct'] });
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al cancelar');
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const handleReschedule = () => {
    navigate(`/client/booking/${appt.listing_id}`, {
      state: { rescheduleFromAppointmentId: appt.id },
    });
  };

  return (
    <Card className="rounded-2xl border shadow-sm overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header: título + badge estado */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-base leading-tight truncate">{appt.listing_title}</p>
            <p className="text-sm text-muted-foreground truncate">{appt.provider_name}</p>
          </div>
          <span className={cn('px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0', statusCfg.className)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Fecha y hora */}
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <span>
            {format(new Date(appt.start_time), "EEEE d 'de' MMMM", { locale: es })}
            {' · '}
            {format(new Date(appt.start_time), 'h:mm a')}
            {' – '}
            {format(new Date(appt.end_time), 'h:mm a')}
          </span>
        </div>

        {/* Mensaje rechazada */}
        {appt.status === 'rejected' && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            El proveedor rechazó esta solicitud. Podés explorar otros horarios disponibles.
          </div>
        )}

        {/* Botones acción */}
        {isActionable && (
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-primary border-primary/40 hover:bg-primary/5 gap-1.5"
              onClick={handleReschedule}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reagendar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelling}
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta cita?</AlertDialogTitle>
            <AlertDialogDescription>
              La cita de {appt.listing_title} del{' '}
              {format(new Date(appt.start_time), "d 'de' MMMM", { locale: es })} será cancelada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const ClientBookings = () => {
  const navigate = useNavigate();
  const { data: appointments = [], isLoading, error } = useClientAppointments();

  return (
    <ClientPageLayout
      title="Mis Reservas"
      subtitle={
        appointments.length > 0
          ? `${appointments.length} cita${appointments.length > 1 ? 's' : ''} activa${appointments.length > 1 ? 's' : ''}`
          : 'No hay citas activas'
      }
    >
      <div className="px-1 space-y-3">
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && error && (
          <div className="text-center py-8">
            <p className="text-sm text-destructive mb-3">Error al cargar tus citas</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        )}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">No tienes citas activas</p>
            <Button onClick={() => navigate('/client/categories')}>
              Explorar servicios
            </Button>
          </div>
        )}

        {!isLoading && appointments.map((appt) => (
          <AppointmentCard key={appt.id} appt={appt} />
        ))}
      </div>
    </ClientPageLayout>
  );
};

export default ClientBookings;

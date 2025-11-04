import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertTriangle, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProviderCancelAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: any;
  onSuccess?: () => void;
}

export const ProviderCancelAppointmentModal: React.FC<ProviderCancelAppointmentModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess
}) => {
  const { user } = useAuth();
  const [cancellationReason, setCancellationReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCancel = async () => {
    console.log('🔄 handleCancel clicked');
    console.log('🔄 cancellationReason:', cancellationReason);
    console.log('🔄 appointment:', appointment);
    
    if (!cancellationReason.trim()) {
      console.log('❌ No cancellation reason provided');
      toast.error('Por favor ingresa una razón para la cancelación');
      return;
    }

    console.log('▶️ Starting cancellation process...');
    setIsSubmitting(true);
    
    try {
      // 1. Cancel appointment atomically using database function
      console.log('🔄 Cancelling appointment atomically...');
      const { data, error: updateError } = await supabase
        .rpc('cancel_appointment_atomic', {
          p_appointment_id: appointment.id,
          p_cancel_future: false,
          p_reason: `provider_cancelled: ${cancellationReason.trim()}`,
          p_cancelled_by: user?.id
        });

      if (updateError) {
        console.error('❌ Error cancelling appointment:', updateError);
        throw updateError;
      }
      
      console.log('✅ Appointment successfully cancelled:', data);
      
      // 2. Add refund documentation as admin notes
      const refundDocumentation = `
DOCUMENTACIÓN DE REEMBOLSO
==========================

Motivo: Cancelación por parte del proveedor
Cita ID: ${appointment.id}
Cliente: ${appointment.client_name || 'N/A'}
Servicio: ${appointment.listings?.title || appointment.service_title || 'N/A'}
Fecha Original: ${new Date(appointment.start_time).toLocaleDateString()}
Hora Original: ${new Date(appointment.start_time).toLocaleTimeString()}

Razón de cancelación del proveedor:
${cancellationReason.trim()}

Monto a reembolsar: $${appointment.final_price || appointment.price || 0}

NOTA IMPORTANTE: El reembolso será procesado a través de OnvoPay según sus términos y condiciones. 
El cliente será notificado sobre el proceso de reembolso y los tiempos estimados de procesamiento.

Fecha de documentación: ${new Date().toLocaleString()}
      `.trim();
      
      // Update admin notes separately
      await supabase
        .from('appointments')
        .update({ admin_notes: refundDocumentation })
        .eq('id', appointment.id);
      
      console.log('✅ Refund documentation added');

      toast.success('Cita cancelada y documentación de reembolso creada');
      
      // Reset form
      setCancellationReason('');
      
      // Call callbacks
      onSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('❌ Error al cancelar la cita:', error);
      console.error('❌ Error details:', error);
      toast.error(`Error al cancelar la cita: ${error?.message || 'Error desconocido'}`);
    } finally {
      console.log('🔄 Setting isSubmitting to false');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCancellationReason('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cancelar Cita
          </DialogTitle>
          <DialogDescription>
            Esta acción cancelará la cita y creará automáticamente la documentación necesaria para el reembolso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información de la cita */}
          <div className="bg-gray-50 p-3 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="font-medium">Cliente:</span> {appointment.client_name || 'N/A'}
            </div>
            <div className="text-sm">
              <span className="font-medium">Servicio:</span> {appointment.listings?.title || appointment.service_title || 'N/A'}
            </div>
            <div className="text-sm">
              <span className="font-medium">Fecha:</span> {new Date(appointment.start_time).toLocaleDateString()}
            </div>
            <div className="text-sm">
              <span className="font-medium">Hora:</span> {new Date(appointment.start_time).toLocaleTimeString()}
            </div>
            {(appointment.final_price || appointment.price) && (
              <div className="text-sm flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="font-medium">Monto a reembolsar:</span> ${appointment.final_price || appointment.price}
              </div>
            )}
          </div>

          {/* Campo de razón */}
          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              Razón de la cancelación <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cancellation-reason"
              placeholder="Ingresa el motivo por el cual necesitas cancelar esta cita..."
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-gray-500">
              {cancellationReason.length}/500 caracteres
            </div>
          </div>

          {/* Nota sobre reembolso */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-800">
              <div className="font-medium">El cliente recibirá el 100% del reembolso.</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={(e) => {
              console.log('🔄 Button clicked!', e);
              console.log('🔄 isSubmitting:', isSubmitting);
              console.log('🔄 cancellationReason.trim():', cancellationReason.trim());
              console.log('🔄 disabled state:', isSubmitting || !cancellationReason.trim());
              handleCancel();
            }}
            disabled={isSubmitting || !cancellationReason.trim()}
            className="flex-1"
          >
            {isSubmitting ? 'Procesando...' : 'Confirmar Cancelación'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

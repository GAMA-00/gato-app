
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Appointment } from '@/lib/types';
import { logger } from '@/utils/logger';

interface SetFinalPriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  onSuccess?: () => void;
}

// Interface para mapear los datos de la base de datos
interface PriceHistoryRow {
  id: string;
  provider_id: string;
  client_id: string;
  listing_id: string;
  amount: number;
  appointment_id: string;
  created_at: string;
}

const SetFinalPriceModal: React.FC<SetFinalPriceModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess
}) => {
  const [finalPrice, setFinalPrice] = useState<string>('');
  const queryClient = useQueryClient();

  // Query para obtener historial de precios
  const { data: priceHistoryData } = useQuery({
    queryKey: ['price-history', appointment.providerId, appointment.clientId, appointment.serviceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('provider_id', appointment.providerId)
        .eq('client_id', appointment.clientId)
        .eq('listing_id', appointment.serviceId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data as PriceHistoryRow[];
    },
    enabled: isOpen && !!appointment.clientId
  });

  // Mutation para guardar el precio final
  const setFinalPriceMutation = useMutation({
    mutationFn: async (price: number) => {
      // CRITICAL: Check if this is a recurring base appointment
      // Base recurring appointments should NOT be marked as completed
      // to allow future virtual instances to be generated
      const isRecurringBase = appointment.recurrence && 
                             appointment.recurrence !== 'none';

      if (isRecurringBase) {
        // For recurring base appointments: only update price, keep status as 'confirmed'
        // This allows the system to continue generating future virtual instances
        logger.warn(`Completing recurring base appointment ${appointment.id} - keeping status as 'confirmed'`);
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ 
            final_price: price,
            price_finalized: true
            // NOT updating status to 'completed' - keep it as 'confirmed'
          })
          .eq('id', appointment.id);

        if (appointmentError) throw appointmentError;
      } else {
        // For regular appointments: mark as completed
        logger.info(`Completing regular appointment ${appointment.id}`);
        const { error: appointmentError } = await supabase
          .from('appointments')
          .update({ 
            final_price: price,
            status: 'completed',
            price_finalized: true
          })
          .eq('id', appointment.id);

        if (appointmentError) throw appointmentError;
      }

      // Guardar en el historial de precios
      const { error: historyError } = await supabase
        .from('price_history')
        .insert({
          provider_id: appointment.providerId,
          client_id: appointment.clientId,
          listing_id: appointment.serviceId,
          amount: price,
          appointment_id: appointment.id
        });

      if (historyError) throw historyError;

      return price;
    },
    onSuccess: () => {
      toast.success('Precio final guardado correctamente');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      onSuccess?.();
      onClose();
    },
    onError: (error) => {
      logger.error('Error al guardar precio final:', error);
      toast.error('Error al guardar el precio final');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = parseFloat(finalPrice);
    if (isNaN(price) || price <= 0) {
      toast.error('Por favor ingresa un precio válido');
      return;
    }

    setFinalPriceMutation.mutate(price);
  };

  const lastPrice = priceHistoryData?.[0]?.amount;

  useEffect(() => {
    if (isOpen) {
      setFinalPrice('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Definir Precio Final</DialogTitle>
          <DialogDescription>
            Por favor, indica el precio final del servicio que acabas de realizar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {lastPrice && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Referencia:</strong> La última vez cobraste ${lastPrice} por este servicio.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="finalPrice">Precio Final</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="finalPrice"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>
              Este monto será cobrado automáticamente al cliente después de confirmar.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={setFinalPriceMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {setFinalPriceMutation.isPending ? 'Guardando...' : 'Confirmar y Completar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SetFinalPriceModal;

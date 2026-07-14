import React from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, Sunrise, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useProviderSettings, useSaveProviderSettings } from '@/hooks/useProviderSettings';

/**
 * Sección "Notificaciones" del perfil del proveedor.
 * Toggles de las notificaciones opcionales por WhatsApp:
 *  - Agenda diaria (6:00 AM)
 *  - Recordatorio 1 h antes de cada cita
 * (La notificación de nueva solicitud siempre está activa.)
 */
const NotificationSettings: React.FC = () => {
  const { data: settings } = useProviderSettings();
  const save = useSaveProviderSettings();

  const toggle = (field: 'notify_daily_agenda' | 'notify_1h_before', value: boolean) => {
    save.mutate({ [field]: value } as any, {
      onSuccess: () => toast.success(value ? 'Notificación activada' : 'Notificación desactivada'),
      onError: () => toast.error('No se pudo guardar. Intentá de nuevo.'),
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <Bell className="h-4 w-4 text-primary" />
        Notificaciones por WhatsApp
      </h3>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Label htmlFor="notify-daily" className="text-sm font-medium">Lista diaria de trabajos</Label>
            <p className="text-xs text-muted-foreground">Cada mañana a las 6:00 AM recibís tus citas del día.</p>
          </div>
        </div>
        <Switch
          id="notify-daily"
          checked={settings?.notify_daily_agenda ?? true}
          onCheckedChange={(v) => toggle('notify_daily_agenda', v)}
          disabled={save.isPending}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <Label htmlFor="notify-1h" className="text-sm font-medium">1 hora antes de cada cita</Label>
            <p className="text-xs text-muted-foreground">Recordatorio para salir con anticipación hacia el cliente.</p>
          </div>
        </div>
        <Switch
          id="notify-1h"
          checked={settings?.notify_1h_before ?? true}
          onCheckedChange={(v) => toggle('notify_1h_before', v)}
          disabled={save.isPending}
        />
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">
        Las alertas de nuevas solicitudes de reserva siempre están activas.
      </p>
    </Card>
  );
};

export default NotificationSettings;

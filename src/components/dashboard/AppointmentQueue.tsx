import React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import { useAuth } from '@/contexts/AuthContext';

const TZ = 'America/Costa_Rica';

const dayKey = (iso: string) => formatInTimeZone(new Date(iso), TZ, 'yyyy-MM-dd');

function dayLabel(iso: string): string {
  const key = dayKey(iso);
  const todayKey = formatInTimeZone(new Date(), TZ, 'yyyy-MM-dd');
  const tomorrowKey = formatInTimeZone(new Date(Date.now() + 86400000), TZ, 'yyyy-MM-dd');
  if (key === todayKey) return 'Hoy';
  if (key === tomorrowKey) return 'Mañana';
  const label = formatInTimeZone(new Date(iso), TZ, "EEEE d 'de' MMMM", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface Props {
  appointments: any[];
  /** Máximo de citas a mostrar (omitir = todas) */
  limit?: number;
  emptyMessage?: string;
}

/** Cola cronológica de citas con separadores por día (Hoy / Mañana / fecha). */
const AppointmentQueue: React.FC<Props> = ({ appointments, limit, emptyMessage = 'No hay citas activas' }) => {
  const { user } = useAuth();
  const visible = limit ? appointments.slice(0, limit) : appointments;

  if (visible.length === 0) {
    return (
      <Card className="glassmorphism">
        <CardContent className="py-10 text-center text-muted-foreground">
          <Calendar className="mx-auto mb-2 h-6 w-6 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar preservando el orden cronológico
  const groups: { label: string; items: any[] }[] = [];
  for (const appt of visible) {
    const label = dayLabel(appt.start_time);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(appt);
    else groups.push({ label, items: [appt] });
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 flex items-center gap-2 px-1">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">{group.label}</span>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">{group.items.length} cita{group.items.length !== 1 ? 's' : ''}</span>
          </div>
          <Card className="glassmorphism">
            <CardContent className="p-0 divide-y">
              {group.items.map((appt) => (
                <AppointmentCard key={appt.id} appointment={appt} user={user} />
              ))}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
};

export default AppointmentQueue;

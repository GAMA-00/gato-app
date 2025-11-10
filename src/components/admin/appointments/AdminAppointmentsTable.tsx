import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeAppointments } from '@/hooks/admin/useRealtimeAppointments';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatInTimeZone } from 'date-fns-tz';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const TIMEZONE = 'America/Costa_Rica';
const PAGE_SIZE = 25;

const recurrenceLabels: Record<string, string> = {
  none: 'Única',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  triweekly: 'Cada 3 semanas',
  monthly: 'Mensual',
};

interface AdminAppointmentsTableProps {
  searchQuery: string;
}

export const AdminAppointmentsTable = ({ searchQuery }: AdminAppointmentsTableProps) => {
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  useRealtimeAppointments();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-appointments', searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(
          `id, start_time, recurrence, client_name, provider_name, listing_id, status, final_price, onvopay_payment_id,
          listings!inner(
            service_types!inner(
              name
            )
          )`,
          { count: 'exact' }
        )
        .order('start_time', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchQuery) {
        query = query.ilike('id', `%${searchQuery}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return { appointments: data, total: count };
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">Error al cargar citas: {error.message}</div>;
  }

  const totalPages = Math.ceil((data?.total || 0) / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Appointment</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Proveedor</TableHead>
              <TableHead>Tipo de Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Recurrencia</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.appointments?.map((apt: any) => {
              const date = formatInTimeZone(new Date(apt.start_time), TIMEZONE, 'dd/MM/yyyy');
              const time = formatInTimeZone(new Date(apt.start_time), TIMEZONE, 'HH:mm');
              
              const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
                pending: { label: 'Pendiente', variant: 'secondary' },
                confirmed: { label: 'Confirmada', variant: 'default' },
                completed: { label: 'Completada', variant: 'outline' },
                cancelled: { label: 'Cancelada', variant: 'destructive' },
                rejected: { label: 'Rechazada', variant: 'destructive' },
              };
              
              const statusInfo = statusLabels[apt.status] || { label: apt.status, variant: 'outline' };
              
              return (
                <TableRow key={apt.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/appointments/${apt.id}`)}>
                  <TableCell className="font-mono text-xs">{apt.id.slice(0, 8)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{date}</div>
                    <div className="text-sm text-muted-foreground">{time}</div>
                  </TableCell>
                  <TableCell>{apt.client_name || '—'}</TableCell>
                  <TableCell>{apt.provider_name || '—'}</TableCell>
                  <TableCell>
                    {(apt.listings as any)?.service_types?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {apt.final_price ? (
                      <span className="font-medium">${parseFloat(apt.final_price.toString()).toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>{recurrenceLabels[apt.recurrence] || apt.recurrence}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/appointments/${apt.id}`);
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Página {page + 1} de {totalPages} • Total: {data?.total || 0} citas
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

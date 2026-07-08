
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingRequests } from '@/hooks/usePendingRequests';
import { useProviderTeamMembers } from '@/hooks/useTeamMembers';
import { logger } from '@/utils/logger';
import { invalidateAppointments, invalidateCalendarAppointments } from '@/utils/queryInvalidation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import RequestCard from './RequestCard';

const PendingRequestsCard: React.FC = () => {
  const { data: pendingRequests = [], isLoading, isError, error } = usePendingRequests();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  if (user?.role !== 'provider') return null;

  const invalidateAll = async () => {
    await Promise.all([
      invalidateAppointments(queryClient, user?.id),
      invalidateCalendarAppointments(queryClient, user?.id),
      queryClient.invalidateQueries({ queryKey: ['pending-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['grouped-pending-requests'] }),
      queryClient.invalidateQueries({ queryKey: ['agenda-week'] }),
    ]);
  };

  const handleAccept = async (request: any, teamMemberId?: string) => {
    try {
      const updatePayload: Record<string, any> = { status: 'confirmed' };
      if (teamMemberId) updatePayload.team_member_id = teamMemberId;

      const { error } = await (supabase as any)
        .from('appointments')
        .update(updatePayload)
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Solicitud aceptada');
      await invalidateAll();
    } catch (e: any) {
      logger.error('Error accepting request:', e);
      toast.error(`Error: ${e.message}`);
    }
  };

  const handleDecline = async (request: any) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      toast.success('Solicitud rechazada');
      await invalidateAll();
    } catch (e: any) {
      logger.error('Error declining request:', e);
      toast.error(`Error: ${e.message}`);
    }
  };

  // Adapta requests individuales al formato que espera RequestCard
  const toRequestCardFormat = (req: any) => ({
    ...req,
    appointment_ids: [req.id],
    appointment_count: 1,
    client_location: req.client_location,
    is_external: req.is_external || req.external_booking,
  });

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Solicitudes de Reserva
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-6 text-red-500">
            <p>Error al cargar solicitudes</p>
            <p className="text-sm mt-2">{error?.message}</p>
          </div>
        ) : pendingRequests.length > 0 ? (
          <div className="space-y-4">
            {pendingRequests.map((request: any) => (
              <RequestCard
                key={request.id}
                request={toRequestCardFormat(request)}
                onAccept={handleAccept}
                onDecline={handleDecline}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No hay solicitudes pendientes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PendingRequestsCard;

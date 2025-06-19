
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupedPendingRequests } from '@/hooks/useGroupedPendingRequests';
import { useRequestActions } from '@/hooks/useRequestActions';
import RequestsHeader from './RequestsHeader';
import RequestCard from './RequestCard';

interface JobRequestsGroupedProps {
  onAcceptRequest?: (request: any) => void;
  onDeclineRequest?: (requestId: string) => void;
}

const JobRequestsGrouped: React.FC<JobRequestsGroupedProps> = ({
  onAcceptRequest,
  onDeclineRequest
}) => {
  const { data: groupedRequests = [], isLoading, isError } = useGroupedPendingRequests();
  const { user } = useAuth();
  const { handleAccept, handleDecline } = useRequestActions();
  
  // Only show component for providers
  if (user?.role !== 'provider') return null;
  
  console.log("Grouped requests in JobRequestsGrouped component:", groupedRequests);

  const onAccept = (request: any) => handleAccept(request, onAcceptRequest);
  const onDecline = (request: any) => handleDecline(request, onDeclineRequest);

  return (
    <Card className="mb-6">
      <RequestsHeader groupedRequests={groupedRequests} />
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[200px] w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-6 text-red-500">
            <p>Error al cargar solicitudes</p>
          </div>
        ) : groupedRequests.length > 0 ? (
          <div className="space-y-4">
            {groupedRequests.map((request: any) => {
              console.log(`Rendering request ${request.id}: clientName="${request.client_name}", isGroup=${request.appointment_count > 1}, appointmentCount=${request.appointment_count}`);
              
              return (
                <RequestCard
                  key={request.id}
                  request={request}
                  onAccept={onAccept}
                  onDecline={onDecline}
                />
              );
            })}
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

export default JobRequestsGrouped;

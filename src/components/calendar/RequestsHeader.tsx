
import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink } from 'lucide-react';

interface RequestsHeaderProps {
  groupedRequests: any[];
}

const RequestsHeader: React.FC<RequestsHeaderProps> = ({ groupedRequests }) => {
  const totalPendingCount = groupedRequests.reduce((sum, req) => sum + req.appointment_count, 0);
  const externalCount = groupedRequests.filter(req => req.is_external).length;

  return (
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center justify-between">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-primary" />
          Solicitudes de Reserva
        </div>
        {groupedRequests.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap">
              {groupedRequests.length} solicitud{groupedRequests.length > 1 ? 'es' : ''}
              {totalPendingCount > groupedRequests.length && (
                <span className="ml-1">({totalPendingCount} citas)</span>
              )}
            </span>
            {externalCount > 0 && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap">
                <ExternalLink className="h-2.5 w-2.5" />
                {externalCount} externa{externalCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </CardTitle>
    </CardHeader>
  );
};

export default RequestsHeader;

import React from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

interface RequestsHeaderProps {
  groupedRequests: any[];
}

const RequestsHeader: React.FC<RequestsHeaderProps> = ({ groupedRequests }) => {
  return (
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center">
        <Calendar className="h-5 w-5 mr-2 text-primary" />
        Solicitudes de Reserva
      </CardTitle>
    </CardHeader>
  );
};

export default RequestsHeader;

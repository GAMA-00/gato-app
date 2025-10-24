
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Clock, MapPin, ExternalLink, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { RecurrenceIndicator } from '@/components/client/booking/RecurrenceIndicator';
import { getServiceSummary } from '@/utils/serviceDetailsFormatter';
import RequestActions from './RequestActions';

interface RequestCardProps {
  request: any;
  onAccept: (request: any) => void;
  onDecline: (request: any) => void;
  isLoading?: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onAccept, onDecline, isLoading = false }) => {
  const isGroup = request.appointment_count > 1;
  const isExternal = request.is_external;
  const { serviceName, details } = getServiceSummary(request);

  // Normalize and validate notes: show only if user actually wrote additional notes
  const normalizedNotes = typeof request.notes === 'string' ? request.notes.trim() : '';
  const shouldShowNotes = normalizedNotes.length > 0 && normalizedNotes !== 'Reserva creada desde la aplicación';
  // Helper function to get initials from name
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre' || name === 'Cliente Externo') return 'CL';
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Get the recurrence type to display - use the actual recurrence value or fallback
  const recurrenceType = request.recurrence || (request.appointment_count > 1 ? 'weekly' : 'none');

  return (
    <div className="border rounded-2xl p-4 md:p-5 shadow-sm relative" style={{ backgroundColor: '#E9FBF3', borderColor: '#10B981' }}>
      {/* Header: Avatar + Client Info + Badge */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar className="h-12 w-12 flex-shrink-0" style={{ borderColor: '#10B981', borderWidth: '2px' }}>
          <AvatarImage alt={request.client_name} />
          <AvatarFallback style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>
            {getInitials(request.client_name)}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[17px] leading-tight" style={{ color: '#111827' }}>
            {request.client_name}
          </div>
          <div className="text-sm leading-tight mt-0.5" style={{ color: '#4B5563' }}>
            {serviceName}
          </div>
          {isExternal && (request.client_phone || request.client_email) && (
            <div className="text-xs mt-1" style={{ color: '#059669' }}>
              {request.client_phone && <div>Tel: {request.client_phone}</div>}
              {request.client_email && <div>Email: {request.client_email}</div>}
            </div>
          )}
        </div>
        
        <Badge 
          variant="outline" 
          className="flex-shrink-0 px-2 py-0.5 text-xs font-medium whitespace-nowrap"
          style={{ borderColor: '#10B981', color: '#059669', backgroundColor: 'transparent' }}
        >
          {isGroup ? (
            <div className="flex items-center gap-1">
              <RecurrenceIndicator 
                recurrence={recurrenceType}
                size="sm"
                showIcon={true}
                showText={false}
              />
              Serie
            </div>
          ) : (
            'Nueva reserva'
          )}
        </Badge>
      </div>

      {/* Meta: Date/Time and Details */}
      <div className="mb-3 text-sm leading-relaxed" style={{ color: '#111827' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
          <span className="font-medium">
            {formatDateES(new Date(request.start_time), 'EEE d MMM', { locale: es })}
          </span>
          <span style={{ color: '#4B5563' }}>•</span>
          <span style={{ color: '#4B5563' }}>
            {format(new Date(request.start_time), 'h:mm a')} – {format(new Date(request.end_time), 'h:mm a')}
          </span>
          {isGroup && (
            <>
              <span style={{ color: '#4B5563' }}>•</span>
              <span className="font-medium" style={{ color: '#10B981' }}>
                {request.appointment_count} citas
              </span>
            </>
          )}
        </div>
        
        {details && (
          <div className="flex items-center gap-1.5 mt-2">
            <DollarSign className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
            <span style={{ color: '#4B5563' }}>{details}</span>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="mb-3">
        <div className="flex items-start gap-1.5 text-sm">
          <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
          <span 
            className="break-words line-clamp-2" 
            style={{ color: '#111827' }}
            title={request.client_location}
          >
            {request.client_location}
          </span>
        </div>
      </div>

      {/* Notes (if any) */}
      {shouldShowNotes && (
        <div className="text-sm p-3 rounded-lg mb-3 overflow-hidden" style={{ backgroundColor: '#D1FAE5' }}>
          <span className="font-medium" style={{ color: '#059669' }}>Notas: </span>
          <span className="break-words" style={{ color: '#111827' }}>{normalizedNotes}</span>
        </div>
      )}

      {/* Actions */}
      <RequestActions 
        request={request}
        onAccept={onAccept}
        onDecline={onDecline}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RequestCard;

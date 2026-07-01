import React, { useState } from 'react';
import { Clock, MapPin, DollarSign, Navigation2, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateES } from '@/lib/utils';
import { getServiceSummary } from '@/utils/serviceDetailsFormatter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProviderTeamMembers, useAssignTeamMember } from '@/hooks/useTeamMembers';
import { useAuth } from '@/contexts/AuthContext';
import RequestActions from './RequestActions';

// WhatsApp SVG icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface RequestCardProps {
  request: any;
  onAccept: (request: any, teamMemberId?: string) => void;
  onDecline: (request: any) => void;
  isLoading?: boolean;
}

const RequestCard: React.FC<RequestCardProps> = ({ request, onAccept, onDecline, isLoading = false }) => {
  const isGroup = request.appointment_count > 1;
  const { serviceName, details } = getServiceSummary(request);
  const { user } = useAuth();
  const { data: teamMembers = [] } = useProviderTeamMembers(user?.id);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const normalizedNotes = typeof request.notes === 'string' ? request.notes.trim() : '';
  const shouldShowNotes = normalizedNotes.length > 0 && normalizedNotes !== 'Reserva creada desde la aplicación';

  // WhatsApp + Waze links
  const phoneRaw = request.client_phone ? request.client_phone.replace(/[^0-9+]/g, '') : null;
  const whatsappUrl = phoneRaw ? `https://wa.me/506${phoneRaw.replace(/^506/, '')}` : null;
  const hasCoords = request.client_lat != null && request.client_lng != null;
  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${request.client_lat},${request.client_lng}&navigate=yes`
    : null;

  const handleAcceptClick = () => {
    onAccept(request, selectedMemberId || undefined);
  };

  return (
    <div className="border rounded-2xl p-4 shadow-sm" style={{ backgroundColor: '#E9FBF3', borderColor: '#10B981' }}>
      {/* Header: nombre + servicio */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[17px] leading-tight" style={{ color: '#111827' }}>
            {request.client_name}
          </div>
          <div className="text-sm leading-tight mt-0.5" style={{ color: '#4B5563' }}>
            {serviceName}
          </div>
        </div>

        {/* WhatsApp + Ubicación */}
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full">
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors text-[#25D366]">
                <WhatsAppIcon className="h-6 w-6" />
              </a>
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                <WhatsAppIcon className="h-6 w-6 text-gray-300" />
              </span>
            )}
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full">
            {wazeUrl ? (
              <a href={wazeUrl} target="_blank" rel="noopener noreferrer"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary">
                <Navigation2 className="h-6 w-6" />
              </a>
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                <Navigation2 className="h-6 w-6 text-gray-300" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fecha/hora y detalles */}
      <div className="mb-3 text-sm leading-relaxed font-semibold" style={{ color: '#111827' }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Clock className="h-4 w-4 flex-shrink-0" style={{ color: '#059669' }} />
          <span>{formatDateES(new Date(request.start_time), 'EEE d MMM', { locale: es })}</span>
          <span>•</span>
          <span>{format(new Date(request.start_time), 'h:mm a')} – {format(new Date(request.end_time), 'h:mm a')}</span>
          {isGroup && (
            <>
              <span>•</span>
              <span style={{ color: '#10B981' }}>{request.appointment_count} citas</span>
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

      {/* Ubicación */}
      {request.client_location && (
        <div className="mb-3">
          <div className="flex items-start gap-1.5 text-sm">
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#059669' }} />
            <span className="break-words line-clamp-2" style={{ color: '#111827' }}>
              {request.client_location}
            </span>
          </div>
        </div>
      )}

      {/* Notas */}
      {shouldShowNotes && (
        <div className="text-sm p-3 rounded-lg mb-3 overflow-hidden" style={{ backgroundColor: '#D1FAE5' }}>
          <span className="font-medium" style={{ color: '#059669' }}>Notas: </span>
          <span className="break-words" style={{ color: '#111827' }}>{normalizedNotes}</span>
        </div>
      )}

      {/* Asignación de miembro del equipo */}
      {teamMembers.length > 0 && (
        <div className="mb-3">
          <Select
            value={selectedMemberId || "none"}
            onValueChange={(v) => setSelectedMemberId(v === "none" ? "" : v)}
          >
            <SelectTrigger className="h-9 text-sm bg-white/70">
              <div className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Asignar a un miembro (opcional)" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin asignar</SelectItem>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Botones aceptar/rechazar */}
      <RequestActions
        request={request}
        onAccept={handleAcceptClick}
        onDecline={onDecline}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RequestCard;

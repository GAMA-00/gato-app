
import React from 'react';
import { Clock, Navigation2 } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppointmentActions from './AppointmentActions';
import {
  getDisplayName,
  getServiceName,
  getLocationInfo,
  getContactInfo,
  getInitials
} from '@/utils/appointmentUtils';
import { formatServiceDetails } from '@/utils/serviceDetailsFormatter';

// WhatsApp SVG icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);


interface AppointmentCardProps {
  appointment: any;
  user: any;
  isPending?: boolean;
  onAccept?: (appointmentId: string) => Promise<void>;
  onReject?: (appointmentId: string) => Promise<void>;
}

const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  user,
  isPending = false,
  onAccept,
  onReject
}) => {
  const displayName = getDisplayName(appointment, user);
  const serviceName = getServiceName(appointment);
  const contactInfo = getContactInfo(appointment);
  const locationInfo = getLocationInfo(appointment);
  const serviceDetails = formatServiceDetails(appointment);

  const hasCoords = appointment.client_lat != null && appointment.client_lng != null;
  const wazeUrl = hasCoords
    ? `https://waze.com/ul?ll=${appointment.client_lat},${appointment.client_lng}&navigate=yes`
    : null;

  const phoneRaw = contactInfo && contactInfo !== 'Sin contacto'
    ? contactInfo.replace(/[^0-9+]/g, '')
    : null;
  const whatsappUrl = phoneRaw ? `https://wa.me/${phoneRaw}` : null;

  return (
    <div className="px-4 py-3 border-b last:border-0">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="w-9 h-9 shrink-0 mt-0.5">
          <AvatarImage alt={displayName} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-sm truncate leading-tight">{displayName}</h4>
          <p className="text-xs text-muted-foreground truncate">{serviceName}</p>
          <p className="text-xs text-primary font-medium truncate">{serviceDetails}</p>

          {/* Bottom row: time (left) + action icons (right) */}
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
              <Clock className="h-3 w-3 text-primary shrink-0" />
              <span className="whitespace-nowrap">
                {format(new Date(appointment.start_time), 'h:mm a')}
                {' – '}
                {format(new Date(appointment.end_time), 'h:mm a')}
              </span>
            </div>

            {/* Action icons — bottom-right */}
            <div className="flex items-center gap-2 shrink-0">
              {whatsappUrl ? (
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" title={contactInfo}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]/10 hover:bg-[#25D366]/20 transition-colors text-[#25D366]">
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <WhatsAppIcon className="h-4 w-4 text-gray-300" />
                </span>
              )}
              {wazeUrl ? (
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer" title={locationInfo || 'Abrir navegación'}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors text-primary">
                  <Navigation2 className="h-4 w-4" />
                </a>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <Navigation2 className="h-4 w-4 text-gray-300" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isPending && onAccept && onReject && (
        <div className="mt-3">
          <AppointmentActions
            appointmentId={appointment.id}
            onAccept={onAccept}
            onReject={onReject}
          />
        </div>
      )}
    </div>
  );
};

export default AppointmentCard;

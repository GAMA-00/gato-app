
import React from 'react';
import { Clock, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import AppointmentActions from './AppointmentActions';
import { 
  getDisplayName, 
  getServiceName, 
  getLocationInfo, 
  getContactInfo, 
  getInitials 
} from '@/utils/appointmentUtils';

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
  const isExternal = appointment.is_external || appointment.external_booking;
  const contactInfo = getContactInfo(appointment);
  const locationInfo = getLocationInfo(appointment);

  console.log(`Rendering appointment ${appointment.id}:`, {
    displayName,
    serviceName,
    isExternal,
    status: appointment.status,
    location: locationInfo,
    rawAppointment: appointment
  });

  return (
    <div className="p-4 border-b last:border-0">
      <div className="flex flex-col gap-3 mb-2">
        <div className="flex items-center min-w-0">
          <Avatar className="w-10 h-10 mr-3 flex-shrink-0">
            <AvatarImage alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">
                {displayName}
              </h4>
              {isExternal && (
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  Externa
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              {serviceName}
            </p>
            {/* Show contact info for external bookings */}
            {contactInfo && (
              <p className="text-xs text-blue-600 truncate mt-0.5">
                {contactInfo}
              </p>
            )}
          </div>
        </div>
        
        {/* Time and location in separate rows for better mobile layout */}
        <div className="space-y-2">
          <div className="flex items-center text-sm font-medium">
            <Clock className="h-3.5 w-3.5 mr-2 text-primary flex-shrink-0" />
            <span>
              {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
            </span>
          </div>
          <div className="flex items-start text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 mr-2 flex-shrink-0 mt-0.5" />
            <span className="break-words leading-relaxed">
              {locationInfo}
            </span>
          </div>
        </div>
      </div>
      
      {isPending && onAccept && onReject && (
        <AppointmentActions
          appointmentId={appointment.id}
          onAccept={onAccept}
          onReject={onReject}
        />
      )}
    </div>
  );
};

export default AppointmentCard;

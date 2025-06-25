
import React from 'react';
import { Clock, MapPin, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import AppointmentActions from './AppointmentActions';

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
  // Enhanced function to get the correct name based on user role
  const getDisplayName = (appointment: any) => {
    // If the user is a provider, show client name
    if (user?.role === 'provider') {
      if (appointment.client_name) {
        return appointment.client_name;
      }
      
      // Fallback for external bookings
      if (appointment.is_external || appointment.external_booking) {
        return 'Cliente Externo';
      }
      
      return 'Cliente sin nombre';
    } 
    // If the user is a client, show provider name
    else {
      if (appointment.provider_name) {
        return appointment.provider_name;
      }
      
      return 'Proveedor desconocido';
    }
  };

  // Helper function to get service name with fallback
  const getServiceName = (appointment: any) => {
    return appointment.listings?.title || 'Servicio';
  };

  // Enhanced location info function with better fallback logic
  const getLocationInfo = (appointment: any) => {
    console.log('Getting location for appointment:', appointment.id, appointment);
    
    // First, check if we have pre-computed complete location
    if (appointment.complete_location) {
      console.log('Using pre-computed location:', appointment.complete_location);
      return appointment.complete_location;
    }
    
    // Fallback: build location manually from available data
    const isExternal = appointment.external_booking || appointment.is_external;
    
    if (isExternal) {
      const location = appointment.client_address || 'Ubicación externa';
      console.log('External appointment location:', location);
      return location;
    }
    
    // Build location from available data
    const locationData = {
      residenciaName: appointment.residencias?.name,
      condominiumName: appointment.users?.condominium_name || appointment.users?.condominium_text,
      houseNumber: appointment.users?.house_number,
      apartment: appointment.apartment,
      clientAddress: appointment.client_address,
      isExternal: false
    };
    
    const parts: string[] = [];
    
    // Add residencia name
    if (locationData.residenciaName && locationData.residenciaName.trim()) {
      parts.push(locationData.residenciaName.trim());
    }
    
    // Add condominium name
    if (locationData.condominiumName && locationData.condominiumName.trim()) {
      parts.push(locationData.condominiumName.trim());
    }
    
    // Add house/apartment number - prioritize apartment, then house_number
    const houseNumber = locationData.apartment || locationData.houseNumber;
    if (houseNumber && houseNumber.toString().trim()) {
      // Format house number consistently, removing any existing prefixes
      const cleanNumber = houseNumber.toString().replace(/^(casa\s*|#\s*)/i, '').trim();
      if (cleanNumber) {
        parts.push(cleanNumber);
      }
    }
    
    // Return in the standardized format: Residencia – Condominio – Número
    if (parts.length >= 3) {
      return parts.join(' – ');
    } else if (parts.length >= 2) {
      return parts.join(' – ');
    } else if (parts.length === 1) {
      return parts[0];
    }
    
    // Fallback if no data
    return 'Ubicación no especificada';
  };

  // Enhanced contact info function
  const getContactInfo = (appointment: any) => {
    // For external bookings, prioritize stored contact info
    if (appointment.is_external || appointment.external_booking) {
      return appointment.client_phone || appointment.client_email || 'Sin contacto';
    }
    
    // For internal bookings, we don't have direct access to user phone/email in this context
    return null;
  };
  
  // Helper function to get initials for avatar
  const getInitials = (name: string) => {
    if (!name || name === 'Cliente sin nombre' || name === 'Proveedor desconocido' || name === 'Cliente Externo') {
      return 'U';
    }
    
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const displayName = getDisplayName(appointment);
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


import React, { useState } from 'react';
import { format } from 'date-fns';
import { Repeat, ExternalLink, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getRecurrenceInfo, isRecurring } from '@/utils/recurrenceUtils';
import { ProviderCancelAppointmentModal } from '@/components/modals/ProviderCancelAppointmentModal';
import { Button } from '@/components/ui/button';

// Status color mapping - Updated colors per requirements
const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  confirmed:    { bg: "#F2FCE2", border: "#75C632", text: "#256029" }, // Green for confirmed
  pending:      { bg: "#FFF3E0", border: "#FF9100", text: "#924C00" }, // Orange for pending requests
  completed:    { bg: "#EEE", border: "#8E9196", text: "#555" },       // Grey
  rejected:     { bg: "#FFEBEE", border: "#E57373", text: "#C62828" }, // Red
  cancelled:    { bg: "#FFEBEE", border: "#E57373", text: "#C62828" }, // Red
  scheduled:    { bg: "#E3F2FD", border: "#2196F3", text: "#1565C0" }  // Blue for recurring
};

// Constants for time calculations
const CALENDAR_START_HOUR = 6; // 6 AM
const CALENDAR_END_HOUR = 20; // 8 PM
const MINUTES_PER_HOUR = 60;
const PIXELS_PER_HOUR = 48;

interface AppointmentDisplayProps {
  appointment: any;
  expanded: boolean;
  onClick: () => void;
}

export const AppointmentDisplay: React.FC<AppointmentDisplayProps> = ({
  appointment,
  expanded,
  onClick
}) => {
  const { user } = useAuth();
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Convert start and end times correctly
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  
  // Calculate precise position and height
  const startHour = startTime.getHours();
  const startMinutes = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinutes = endTime.getMinutes();
  
  const minutesFromCalendarStart = ((startHour - CALENDAR_START_HOUR) * MINUTES_PER_HOUR) + startMinutes;
  const totalDurationMinutes = ((endHour - startHour) * MINUTES_PER_HOUR) + (endMinutes - startMinutes);
  
  const topPosition = (minutesFromCalendarStart / MINUTES_PER_HOUR) * PIXELS_PER_HOUR;
  const appointmentHeight = Math.max((totalDurationMinutes / MINUTES_PER_HOUR) * PIXELS_PER_HOUR, 20);
  
  // Clamp to visible calendar window so items outside 6–20h are hinted at the edges
  const CONTAINER_HEIGHT_PX = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * PIXELS_PER_HOUR;
  const clampedTop = Math.max(0, topPosition);
  const clampedBottom = Math.min(CONTAINER_HEIGHT_PX, clampedTop + appointmentHeight);
  const clampedHeight = Math.max(20, clampedBottom - clampedTop);

  // Use scheduled status for recurring instances if no specific status
  const appointmentStatus = appointment.status || 'scheduled';
  
  // Check if this appointment has rescheduled styling
  let statusColor = STATUS_COLORS[appointmentStatus] || STATUS_COLORS['pending'];
  
  // Apply rescheduled styling if present
  if (appointment.rescheduled_style) {
    // Extract colors from rescheduled_style classes
    if (appointment.rescheduled_style.includes('bg-red-100')) {
      statusColor = { bg: "#FEE2E2", border: "#EF4444", text: "#991B1B" }; // Red for cancelled
    } else if (appointment.rescheduled_style.includes('bg-orange-100')) {
      statusColor = { bg: "#FED7AA", border: "#EA580C", text: "#9A3412" }; // Orange for rescheduled
    }
  }
  
  // Determine appointment type flags using centralized utilities
  const appointmentIsRecurring = isRecurring(appointment.recurrence);
  const isExternal = appointment.external_booking || appointment.is_external;
  
  // Get person name based on user role
  const getPersonName = () => {
    if (user?.role === 'client') {
      return appointment.provider_name || 'Proveedor';
    } else {
      // For providers viewing client appointments, show the actual client name
      return appointment.client_name || (isExternal ? 'Cliente Externo' : 'Cliente');
    }
  };
  
  const personName = getPersonName();
  const serviceName = appointment.listings?.title || appointment.service_title || 'Servicio';


  // Get status label
  const getStatusLabel = () => {
    // Check for rescheduled status first
    if (appointment.rescheduled_style) {
      if (appointment.rescheduled_style.includes('bg-red-100')) {
        return 'Cancelada';
      } else if (appointment.rescheduled_style.includes('bg-orange-100')) {
        return 'Reagendada';
      }
    }
    
    switch (appointmentStatus) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendiente';
      case 'completed': return 'Completada';
      case 'scheduled': return 'Programada';
      case 'rejected': return 'Rechazada';
      case 'cancelled': return 'Cancelada';
      default: return 'Desconocido';
    }
  };

  // Get reschedule notes to show in tooltip
  const getRescheduleNote = () => {
    if (appointment.reschedule_notes) {
      return ` - ${appointment.reschedule_notes}`;
    }
    return '';
  };

  // Get recurrence label using centralized utilities
  const recurrenceInfo = getRecurrenceInfo(appointment.recurrence);
  const recurrenceLabel = appointmentIsRecurring ? recurrenceInfo.label : null;

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCancelModal(true);
  };

  const canCancelAppointment = () => {
    // Solo proveedores pueden cancelar y solo si la cita no está ya cancelada/completada
    return user?.role === 'provider' && 
           appointment.status !== 'cancelled' && 
           appointment.status !== 'completed';
  };

  return (
    <>
      <ProviderCancelAppointmentModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        appointment={appointment}
        onSuccess={() => {
          // Refrescar la vista del calendario
          window.location.reload();
        }}
      />
      <div
      className={cn(
        "absolute left-1 right-1 overflow-hidden shadow-sm transition-all duration-150 cursor-pointer rounded text-xs z-10",
        expanded ? "z-20 bg-white border border-gray-200 p-2 h-fit min-h-[24px]" : "px-1 py-0.5",
        appointmentIsRecurring && "border-l-4",
        isExternal && "border-r-2 border-r-blue-400"
      )}
      style={{
        top: `${clampedTop}px`,
        height: expanded ? undefined : `${clampedHeight}px`,
        background: expanded ? '#fff' : statusColor.bg,
        borderLeftColor: statusColor.border,
        color: statusColor.text,
        fontWeight: 500,
        minHeight: expanded ? '24px' : '20px'
      }}
      title={`${serviceName} - ${format(startTime, "HH:mm")} a ${format(endTime, "HH:mm")}${recurrenceLabel ? ` (${recurrenceLabel})` : ''}${isExternal ? ' (Externa)' : ''}${getRescheduleNote()}`}
      onClick={onClick}
      tabIndex={0}
      role="button"
    >
      <div className="flex items-start gap-1 h-full">
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Purple recurring icon for recurring appointments */}
          {appointmentIsRecurring && <Repeat className="h-2 w-2 text-purple-600 flex-shrink-0" />}
          {isExternal && <ExternalLink className="h-2 w-2 text-blue-500 flex-shrink-0" />}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div 
            className={cn(
              "truncate font-semibold leading-tight", 
              expanded ? "text-xs mb-0.5" : "text-[10px]"
            )}
            style={{ color: statusColor.text }}>
            {personName}
          </div>
          <div 
            className={cn(
              "truncate leading-tight",
              expanded ? "text-[10px] font-medium" : "text-[9px] font-normal"
            )}
            style={{ color: statusColor.text }}>
            {serviceName}
          </div>
          {!expanded && appointmentHeight >= 28 && (
            <div className="text-[8px] mt-0.5 leading-tight opacity-75" style={{ color: statusColor.text }}>
              {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")}
            </div>
          )}
        </div>
      </div>
      
      {/* Always show recurrence indicator */}
      <div className="text-[8px] mt-0.5 leading-tight opacity-75 flex items-center gap-1" style={{ color: statusColor.text }}>
        <span>{recurrenceLabel || 'Una vez'}</span>
      </div>

      {expanded && (
        <div className="text-[10px] mt-1 text-gray-400 border-t pt-1">
          <div className="font-medium">
            {format(startTime, "HH:mm")} - {format(endTime, "HH:mm")} ({totalDurationMinutes} min)
          </div>
          <div className="flex gap-2 mt-1">
            {appointmentIsRecurring && (
              <div className="flex items-center gap-1">
                <Repeat className="h-2 w-2 text-purple-600" />
                <span className="text-purple-600 text-[9px]">{recurrenceLabel}</span>
              </div>
            )}
            {isExternal && (
              <div className="flex items-center gap-1">
                <ExternalLink className="h-2 w-2 text-blue-500" />
                <span className="text-blue-500 text-[9px]">Externa</span>
              </div>
            )}
          </div>
          <div className="mt-1 pt-1 border-t text-[9px]">
            <span className={cn(
              "px-1 py-0.5 rounded-full text-[8px]",
              appointmentStatus === 'pending' ? "bg-amber-50 text-amber-800" :
              appointmentStatus === 'confirmed' ? "bg-green-50 text-green-800" :
              appointmentStatus === 'scheduled' ? "bg-blue-50 text-blue-800" :
              "bg-gray-50 text-gray-700"
            )}>
              {getStatusLabel()}
            </span>
            
            {/* Botón de cancelar para proveedores - debajo del estado */}
            {canCancelAppointment() && (
              <div className="mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelClick}
                  className="h-6 px-2 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancelar
                </Button>
              </div>
            )}
            
            {appointment.reschedule_notes && (
              <div className="mt-1 text-[8px] text-gray-600 bg-gray-50 p-1 rounded">
                {appointment.reschedule_notes}
              </div>
            )}
            
            {appointment.cancellation_reason && (
              <div className="mt-1 text-[8px] text-red-600 bg-red-50 p-1 rounded">
                <span className="font-medium">Cancelada:</span> {appointment.cancellation_reason}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
};

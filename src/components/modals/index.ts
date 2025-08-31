/**
 * ÍNDICE DE MODALES CONSOLIDADOS
 * ==============================
 * 
 * Punto de entrada unificado para todos los modales de booking
 */

// ===== MODAL BASE =====
export { 
  BaseBookingModal, 
  useModalLoading, 
  useBookingQueries,
  type BaseModalAction,
  type BaseBookingModalProps 
} from './BaseBookingModal';

// ===== MODALES ESPECIALIZADOS =====
export { 
  CancelAppointmentModal,
  type CancelAppointmentModalProps 
} from './CancelAppointmentModal';

export { 
  ProviderCancelAppointmentModal 
} from './ProviderCancelAppointmentModal';

// TODO: Agregar cuando esté migrado
// export { 
//   RescheduleAppointmentModal,
//   type RescheduleAppointmentModalProps 
// } from './RescheduleAppointmentModal';
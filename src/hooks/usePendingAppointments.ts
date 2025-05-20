
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointments } from "./useAppointments";

export function usePendingAppointments() {
  const { user } = useAuth();
  const { data: appointments = [] } = useAppointments();

  // Filter only pending appointments for providers
  const pendingAppointments = user?.role === 'provider' 
    ? appointments.filter(app => app.status === 'pending')
    : [];
  
  const count = pendingAppointments.length;

  return {
    pendingAppointments,
    count,
    hasPending: count > 0
  };
}

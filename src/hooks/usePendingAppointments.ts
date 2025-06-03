
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useGroupedPendingRequests } from "./useGroupedPendingRequests";

export function usePendingAppointments() {
  const { user } = useAuth();
  const { data: groupedRequests = [] } = useGroupedPendingRequests();

  // Calculate total pending appointments count
  const count = groupedRequests.reduce((sum, req) => sum + req.appointment_count, 0);

  return {
    pendingAppointments: groupedRequests,
    count,
    hasPending: count > 0
  };
}

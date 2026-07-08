import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const db = supabase as any;

export interface TeamMember {
  id: string;
  provider_id: string;
  name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export function useTeamMembers() {
  const { user } = useAuth();
  return useQuery<TeamMember[]>({
    queryKey: ["team-members", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await db
        .from("provider_team_members")
        .select("*")
        .eq("provider_id", user!.id)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Miembros activos de un proveedor por ID (para asignación en PendingRequestsCard). */
export function useProviderTeamMembers(providerId?: string) {
  return useQuery<TeamMember[]>({
    queryKey: ["provider-team-members", providerId],
    enabled: !!providerId,
    queryFn: async () => {
      const { data, error } = await db
        .from("provider_team_members")
        .select("id, name, phone")
        .eq("provider_id", providerId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAddTeamMember() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { error } = await db.from("provider_team_members").insert({
        provider_id: user!.id,
        name: name.trim(),
        phone: phone.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", user?.id] }),
  });
}

export function useRemoveTeamMember() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("provider_team_members")
        .update({ is_active: false })
        .eq("id", id)
        .eq("provider_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["team-members", user?.id] }),
  });
}

export function useAssignTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      appointmentId,
      teamMemberId,
    }: {
      appointmentId: string;
      teamMemberId: string | null;
    }) => {
      const { error } = await db
        .from("appointments")
        .update({ team_member_id: teamMemberId })
        .eq("id", appointmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["agenda-week"] });
      qc.invalidateQueries({ queryKey: ["pending-requests"] });
    },
  });
}

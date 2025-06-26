
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';

export const useTeamMembers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['team-members', user?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      console.log("=== FETCHING TEAM MEMBERS ===");
      console.log("User ID:", user?.id);
      
      if (!user?.id) {
        console.log("No user ID, returning empty array");
        return [];
      }

      try {
        const { data, error } = await supabase
          .from('team_members')
          .select('*')
          .eq('provider_id', user.id)
          .order('position_order', { ascending: true });

        if (error) {
          console.error("Supabase error fetching team members:", error);
          throw error;
        }

        console.log("Team members fetched successfully:", data?.length || 0);

        return (data || []).map(member => ({
          id: member.id,
          providerId: member.provider_id,
          name: member.name,
          cedula: member.cedula,
          phone: member.phone,
          photoUrl: member.photo_url,
          criminalRecordFileUrl: member.criminal_record_file_url,
          role: member.role as 'lider' | 'auxiliar',
          positionOrder: member.position_order,
          createdAt: member.created_at,
          updatedAt: member.updated_at
        }));
      } catch (error) {
        console.error("Error in useTeamMembers queryFn:", error);
        throw error;
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateTeamMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: TeamMemberFormData) => {
      console.log("=== CREATING TEAM MEMBER ===");
      console.log("Member data:", memberData);
      
      if (!user?.id) throw new Error('Usuario no autenticado');

      try {
        // Get next position order
        const { data: existingMembers } = await supabase
          .from('team_members')
          .select('position_order')
          .eq('provider_id', user.id)
          .order('position_order', { ascending: false })
          .limit(1);

        const nextOrder = existingMembers?.[0]?.position_order ? existingMembers[0].position_order + 1 : 1;

        const { data, error } = await supabase
          .from('team_members')
          .insert({
            provider_id: user.id,
            name: memberData.name,
            cedula: memberData.cedula,
            phone: memberData.phone,
            photo_url: memberData.photoUrl,
            criminal_record_file_url: memberData.criminalRecordFileUrl,
            role: 'auxiliar',
            position_order: nextOrder
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase error creating team member:", error);
          throw error;
        }

        console.log("Team member created successfully:", data.id);
        return data;
      } catch (error) {
        console.error("Error in useCreateTeamMember:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', user?.id] });
      toast.success('Miembro del equipo agregado correctamente');
    },
    onError: (error) => {
      console.error('Error creating team member:', error);
      toast.error('Error al agregar miembro del equipo');
    }
  });
};

export const useUpdateTeamMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...memberData }: { id: string } & Partial<TeamMemberFormData>) => {
      console.log("=== UPDATING TEAM MEMBER ===");
      console.log("Member ID:", id);
      console.log("Update data:", memberData);
      
      try {
        const { data, error } = await supabase
          .from('team_members')
          .update({
            name: memberData.name,
            cedula: memberData.cedula,
            phone: memberData.phone,
            photo_url: memberData.photoUrl,
            criminal_record_file_url: memberData.criminalRecordFileUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error("Supabase error updating team member:", error);
          throw error;
        }

        console.log("Team member updated successfully:", data.id);
        return data;
      } catch (error) {
        console.error("Error in useUpdateTeamMember:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', user?.id] });
      toast.success('Miembro del equipo actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating team member:', error);
      toast.error('Error al actualizar miembro del equipo');
    }
  });
};

export const useDeleteTeamMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      console.log("=== DELETING TEAM MEMBER ===");
      console.log("Member ID:", memberId);
      
      try {
        const { error } = await supabase
          .from('team_members')
          .delete()
          .eq('id', memberId);

        if (error) {
          console.error("Supabase error deleting team member:", error);
          throw error;
        }

        console.log("Team member deleted successfully");
      } catch (error) {
        console.error("Error in useDeleteTeamMember:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', user?.id] });
      toast.success('Miembro del equipo eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting team member:', error);
      toast.error('Error al eliminar miembro del equipo');
    }
  });
};


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
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('provider_id', user.id)
        .order('position_order', { ascending: true });

      if (error) throw error;

      return data.map(member => ({
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
    },
    enabled: !!user?.id
  });
};

export const useCreateTeamMember = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData: TeamMemberFormData) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Obtener el siguiente número de orden
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

      if (error) throw error;
      return data;
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

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
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

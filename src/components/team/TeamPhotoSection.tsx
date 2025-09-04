import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import EnhancedAvatar from '@/components/ui/enhanced-avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { TeamMember } from '@/lib/teamTypes';

interface TeamPhotoSectionProps {
  providerId: string;
}

const TeamPhotoSection: React.FC<TeamPhotoSectionProps> = ({ providerId }) => {
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team-members-photos', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('provider_id', providerId)
        .order('position_order', { ascending: true });

      if (error) throw error;
      
      // Transform database fields to match TeamMember interface
      return data.map(member => ({
        id: member.id,
        providerId: member.provider_id,
        name: member.name,
        cedula: member.cedula,
        phone: member.phone,
        photoUrl: member.photo_url,
        criminalRecordFileUrl: member.criminal_record_file_url,
        role: member.role,
        positionOrder: member.position_order,
        createdAt: member.created_at,
        updatedAt: member.updated_at
      })) as TeamMember[];
    },
    enabled: !!providerId,
  });

  // Get provider info for the leader
  const { data: providerInfo } = useQuery({
    queryKey: ['provider-info', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .eq('id', providerId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });

  if (isLoading) {
    return null; // Don't show loading for this section
  }

  // Create team leader from provider info
  const teamLeader = providerInfo ? {
    id: providerInfo.id,
    name: providerInfo.name || 'Proveedor',
    photoUrl: providerInfo.avatar_url,
    role: 'lider' as const
  } : null;

  const allMembers = teamLeader ? [teamLeader, ...teamMembers] : teamMembers;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Equipo de Trabajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allMembers.length <= 1 ? (
          <div className="text-center py-4">
            {teamLeader ? (
              <div className="space-y-3">
                <EnhancedAvatar
                  src={teamLeader.photoUrl}
                  alt={teamLeader.name}
                  className="w-16 h-16 mx-auto"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {teamLeader.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Trabaja de forma individual
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Información del equipo no disponible
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allMembers.map((member) => (
              <div key={member.id} className="text-center">
                <EnhancedAvatar
                  src={member.photoUrl}
                  alt={member.name}
                  className="w-16 h-16 mx-auto mb-2"
                />
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {member.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {member.role === 'lider' ? 'Líder' : 'Auxiliar'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamPhotoSection;
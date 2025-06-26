
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TeamMember } from '@/lib/teamTypes';
import TeamMemberCard from './TeamMemberCard';

interface ClientTeamViewProps {
  providerId: string;
  providerName?: string;
  providerPhone?: string;
  providerAvatarUrl?: string;
}

const ClientTeamView: React.FC<ClientTeamViewProps> = ({
  providerId,
  providerName,
  providerPhone,
  providerAvatarUrl
}) => {
  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['client-team-view', providerId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('provider_id', providerId)
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
    }
  });

  // Crear líder del equipo basado en datos del proveedor
  const teamLeader: TeamMember = {
    id: providerId,
    providerId: providerId,
    name: providerName || 'Proveedor',
    cedula: '',
    phone: providerPhone || '',
    photoUrl: providerAvatarUrl,
    criminalRecordFileUrl: '',
    role: 'lider',
    positionOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allMembers = [teamLeader, ...teamMembers];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo asignado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando información del equipo...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Equipo asignado ({allMembers.length} {allMembers.length === 1 ? 'persona' : 'personas'})
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allMembers.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onEdit={() => {}}
              onDelete={() => {}}
              isProvider={false}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientTeamView;

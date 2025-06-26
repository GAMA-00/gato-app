
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember
} from '@/hooks/useTeamMembers';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';
import TeamMemberCard from './TeamMemberCard';
import TeamMemberModal from './TeamMemberModal';

const TeamSection: React.FC = () => {
  const { user, profile } = useAuth();
  const { data: teamMembers = [], isLoading } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();

  // Crear líder del equipo basado en el perfil del usuario
  const teamLeader: TeamMember = {
    id: user?.id || '',
    providerId: user?.id || '',
    name: profile?.name || 'Proveedor',
    cedula: '',
    phone: profile?.phone || '',
    photoUrl: profile?.avatar_url,
    criminalRecordFileUrl: '',
    role: 'lider',
    positionOrder: 0,
    createdAt: profile?.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const allMembers = [teamLeader, ...teamMembers];

  const handleCreateMember = () => {
    setModalMode('create');
    setEditingMember(undefined);
    setModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setModalMode('edit');
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleDeleteMember = (memberId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este miembro del equipo?')) {
      deleteMember.mutate(memberId);
    }
  };

  const handleSaveMember = (data: TeamMemberFormData) => {
    if (modalMode === 'create') {
      createMember.mutate(data);
    } else if (modalMode === 'edit' && editingMember) {
      updateMember.mutate({ id: editingMember.id, ...data });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Cargando equipo...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo ({allMembers.length} {allMembers.length === 1 ? 'miembro' : 'miembros'})
          </CardTitle>
          <Button onClick={handleCreateMember} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Agregar miembro
          </Button>
        </CardHeader>
        
        <CardContent>
          {allMembers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No tienes miembros en tu equipo aún
              </p>
              <Button onClick={handleCreateMember}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer miembro
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allMembers.map((member) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  onEdit={handleEditMember}
                  onDelete={handleDeleteMember}
                  isProvider={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TeamMemberModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        member={editingMember}
        mode={modalMode}
        onSave={handleSaveMember}
      />
    </>
  );
};

export default TeamSection;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Users, Loader2, AlertCircle } from 'lucide-react';
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
  console.log("=== TEAM SECTION RENDER ===");
  
  const { user, profile } = useAuth();
  const { data: teamMembers = [], isLoading, error } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();

  console.log("TeamSection - User:", user?.id);
  console.log("TeamSection - Profile:", profile?.name);
  console.log("TeamSection - Team members:", teamMembers?.length || 0);
  console.log("TeamSection - Loading:", isLoading);
  console.log("TeamSection - Error:", error);

  // Create team leader based on user profile
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
    console.log("TeamSection - Creating new member");
    setModalMode('create');
    setEditingMember(undefined);
    setModalOpen(true);
  };

  const handleEditMember = (member: TeamMember) => {
    console.log("TeamSection - Editing member:", member.id);
    setModalMode('edit');
    setEditingMember(member);
    setModalOpen(true);
  };

  const handleDeleteMember = (memberId: string) => {
    console.log("TeamSection - Deleting member:", memberId);
    if (confirm('¿Estás seguro de que quieres eliminar este miembro del equipo?')) {
      deleteMember.mutate(memberId);
    }
  };

  const handleSaveMember = (data: TeamMemberFormData) => {
    console.log("TeamSection - Saving member:", data);
    if (modalMode === 'create') {
      createMember.mutate(data);
    } else if (modalMode === 'edit' && editingMember) {
      updateMember.mutate({ id: editingMember.id, ...data });
    }
    setModalOpen(false);
  };

  // Error state
  if (error) {
    console.error("TeamSection - Error loading team members:", error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Error al cargar equipo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del equipo.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state with improved skeleton
  if (isLoading) {
    console.log("TeamSection - Showing loading state");
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo
            <Skeleton className="h-4 w-16" />
          </CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  console.log("TeamSection - Rendering main content with", allMembers.length, "members");

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
          {allMembers.length === 1 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Solo tienes el líder del equipo. Agrega miembros auxiliares.
              </p>
              <Button onClick={handleCreateMember}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer auxiliar
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

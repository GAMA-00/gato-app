
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
import { useTeamMemberPhotoUpload } from '@/hooks/useTeamMemberPhotoUpload';
import { TeamMember, TeamMemberFormData } from '@/lib/teamTypes';
import TeamMemberCard from './TeamMemberCard';
import TeamMemberModal from './TeamMemberModal';
import { useIsMobile } from '@/hooks/use-mobile';

const TeamSection: React.FC = () => {
  console.log("=== TEAM SECTION RENDER ===");
  
  const { user, profile } = useAuth();
  const { data: teamMembers = [], isLoading, error } = useTeamMembers();
  const createMember = useCreateTeamMember();
  const updateMember = useUpdateTeamMember();
  const deleteMember = useDeleteTeamMember();
  const photoUploadMutation = useTeamMemberPhotoUpload();
  const isMobile = useIsMobile();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingMember, setEditingMember] = useState<TeamMember | undefined>();

  console.log("TeamSection - User:", user?.id);
  console.log("TeamSection - Profile:", profile?.name);
  console.log("TeamSection - Team members:", teamMembers?.length || 0);
  console.log("TeamSection - Loading:", isLoading);
  console.log("TeamSection - Error:", error);

  // Only show auxiliary team members, not the leader
  const allMembers = teamMembers;

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

  const handleSaveMember = async (data: TeamMemberFormData, photoFile?: File) => {
    console.log("=== HANDLING SAVE MEMBER ===");
    console.log("Mode:", modalMode);
    console.log("Member data:", data);
    console.log("Has photo file:", !!photoFile);

    try {
      if (modalMode === 'create') {
        console.log("🔵 Creating new team member...");
        
        // First create the member without photo
        const result = await createMember.mutateAsync(data);
        console.log("✅ Member created with ID:", result.id);
        
        // If there's a photo, upload it now with the real member ID
        if (photoFile && user?.id) {
          console.log("🔵 Uploading photo for member:", result.id);
          await photoUploadMutation.mutateAsync({
            memberId: result.id,
            photoFile: photoFile,
            providerId: user.id
          });
          console.log("✅ Photo uploaded successfully");
        }
        
      } else if (modalMode === 'edit' && editingMember) {
        console.log("🔵 Updating existing team member...");
        
        await updateMember.mutateAsync({
          id: editingMember.id,
          ...data
        });
        
        // If there's a new photo, upload it
        if (photoFile && user?.id) {
          console.log("🔵 Uploading new photo for member:", editingMember.id);
          await photoUploadMutation.mutateAsync({
            memberId: editingMember.id,
            photoFile: photoFile,
            providerId: user.id
          });
          console.log("✅ Photo updated successfully");
        }
      }
      
      setModalOpen(false);
    } catch (error) {
      console.error("Error in handleSaveMember:", error);
    }
  };

  // Error state
  if (error) {
    console.error("TeamSection - Error loading team members:", error);
    return (
      <Card className={isMobile ? "mx-2" : ""}>
        <CardHeader className={isMobile ? "px-4 py-4" : ""}>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Error al cargar equipo
          </CardTitle>
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div className={`text-center ${isMobile ? "py-6" : "py-8"}`}>
            <p className={`text-muted-foreground ${isMobile ? "mb-3 text-sm" : "mb-4"}`}>
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
      <Card className={isMobile ? "mx-2" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? "px-4 py-4" : ""}`}>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo
            <Skeleton className="h-4 w-16" />
          </CardTitle>
          <Skeleton className="h-9 w-32" />
        </CardHeader>
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isMobile ? "gap-3" : "gap-4"}`}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`border rounded-lg ${isMobile ? "p-3" : "p-4"}`}>
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
      <Card className={isMobile ? "mx-2" : ""}>
        <CardHeader className={`flex flex-row items-center justify-between ${isMobile ? "px-4 py-4 gap-3" : ""}`}>
          <CardTitle className={`flex items-center gap-2 ${isMobile ? "text-lg" : ""}`}>
            <Users className="w-5 h-5" />
            <span className={isMobile ? "leading-tight" : ""}>
              Equipo ({allMembers.length} {allMembers.length === 1 ? 'auxiliar' : 'auxiliares'})
            </span>
          </CardTitle>
          <Button onClick={handleCreateMember} size={isMobile ? "sm" : "sm"} className={isMobile ? "flex-shrink-0" : ""}>
            <Plus className="w-4 h-4 mr-2" />
            <span className={isMobile ? "hidden xs:inline" : ""}>Agregar</span>
            <span className={isMobile ? "xs:hidden" : "hidden"}>+</span>
          </Button>
        </CardHeader>
        
        <CardContent className={isMobile ? "px-4 pb-4" : ""}>
          {allMembers.length === 0 ? (
            <div className={`text-center ${isMobile ? "py-6" : "py-8"}`}>
              <Users className={`mx-auto text-muted-foreground ${isMobile ? "w-10 h-10 mb-3" : "w-12 h-12 mb-4"}`} />
              <p className={`text-muted-foreground ${isMobile ? "mb-3 text-sm px-2" : "mb-4"}`}>
                Aún no tienes auxiliares en tu equipo. Agrega miembros auxiliares.
              </p>
              <Button onClick={handleCreateMember} className={isMobile ? "text-sm" : ""}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar primer auxiliar
              </Button>
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isMobile ? "gap-3" : "gap-4"}`}>
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
        providerId={user?.id || ''}
      />
    </>
  );
};

export default TeamSection;

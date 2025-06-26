
import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, User, Mail, Phone, Building, FileText, Calendar } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import EditProfileModal from '@/components/profile/EditProfileModal';

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useUserProfile();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Navbar />
        <PageContainer title="Mi Perfil">
          <Card className="p-6 text-center">
            <p className="text-muted-foreground">
              No se pudo cargar la información del perfil.
            </p>
          </Card>
        </PageContainer>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Mi Perfil" subtitle="Gestiona tu información personal" className="pt-0">
          <div className="max-w-2xl mx-auto space-y-6">
            <Card className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-10 w-full mt-6" />
            </Card>
          </div>
        </PageContainer>
      </>
    );
  }

  const displayProfile = profile || user;

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Mi Perfil" 
        subtitle="Gestiona tu información personal"
        className="pt-0"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="p-6">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={displayProfile.avatar_url || displayProfile.avatarUrl} alt={displayProfile.name} />
                <AvatarFallback className="text-2xl">
                  {displayProfile.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{displayProfile.name}</h2>
                <p className="text-muted-foreground capitalize">{displayProfile.role}</p>
                {profile?.experience_years && (
                  <p className="text-sm text-muted-foreground">
                    {profile.experience_years} años de experiencia
                  </p>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{displayProfile.email}</span>
              </div>
              
              {displayProfile.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{displayProfile.phone}</span>
                </div>
              )}
              
              {(displayProfile.condominium_name || displayProfile.condominium_text || displayProfile.condominiumName) && (
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span>
                    {displayProfile.condominium_name || displayProfile.condominium_text || displayProfile.condominiumName}
                    {(displayProfile.house_number || displayProfile.houseNumber) && 
                      ` - Casa ${displayProfile.house_number || displayProfile.houseNumber}`
                    }
                  </span>
                </div>
              )}

              {profile?.about_me && (
                <div className="pt-4 border-t">
                  <h3 className="font-semibold mb-2">Acerca de mí</h3>
                  <p className="text-muted-foreground">{profile.about_me}</p>
                </div>
              )}

              {profile?.certification_files && (
                <div className="pt-4 border-t">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-semibold">Certificaciones</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(profile.certification_files) 
                      ? `${profile.certification_files.length} certificaciones cargadas`
                      : 'Certificaciones disponibles'
                    }
                  </p>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <Button 
                className="w-full"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="mr-2 h-4 w-4" />
                Editar Perfil
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>

      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  );
};

export default Profile;

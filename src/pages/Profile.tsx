import React, { useState } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useProfileSync } from '@/hooks/useProfileSync';
import { useComprehensiveSync } from '@/hooks/useComprehensiveSync';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Mail, Phone, MapPin, RefreshCw } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { formatPhoneForDisplay } from '@/utils/phoneUtils';

const Profile = () => {
  const { user } = useAuth();
  const { profile, isLoading } = useUserProfile();
  const { syncProfileChanges, forceSyncProfile } = useProfileSync();
  const { forceFullSync } = useComprehensiveSync();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!user) {
    return (
      <>
        <Navbar />
        <PageContainer title="Perfil">
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
        <PageContainer title="Perfil" className="pt-0">
          <div className="max-w-md mx-auto space-y-4">
            <Card className="p-6 bg-muted/30">
              <div className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full mb-4" />
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-40" />
            </Card>
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </PageContainer>
      </>
    );
  }

  // Use profile data if available, otherwise fall back to user data
  const displayData = profile || user;
  const condominiumInfo = profile?.condominium_text || profile?.condominium_name || '';
  const houseNumber = profile?.house_number || '';
  const locationText = condominiumInfo 
    ? `${condominiumInfo}${houseNumber ? ` - Casa ${houseNumber}` : ''}`
    : '';

  // Get initials for avatar
  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  // Get role display text
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'client': return 'Cliente';
      case 'provider': return 'Proveedor';
      case 'admin': return 'Administrador';
      default: return role;
    }
  };

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Perfil" 
        className="pt-0"
      >
        <div className="max-w-md mx-auto space-y-4">
          {/* Avatar Card */}
          <Card className="p-6 bg-muted/40">
            <div className="flex flex-col items-center">
              {/* Avatar Circle with Initial */}
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center mb-4 shadow-sm">
                <span className="text-4xl font-medium text-primary">
                  {getInitials(displayData.name)}
                </span>
              </div>
              
              {/* Name */}
              <h2 className="text-xl font-semibold text-foreground">
                {displayData.name}
              </h2>
              
              {/* Role */}
              <p className="text-muted-foreground">
                {getRoleDisplay(displayData.role)}
              </p>
            </div>
          </Card>

          {/* Contact Info Card */}
          <Card className="p-4">
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-foreground">{displayData.email}</span>
              </div>
              
              {/* Phone */}
              {displayData.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{formatPhoneForDisplay(displayData.phone)}</span>
                </div>
              )}
              
              {/* Location */}
              {locationText && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-foreground">{locationText}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Provider-specific: About Me section */}
          {user.role === 'provider' && profile?.about_me && (
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Acerca de mí</h3>
              <p className="text-muted-foreground">{profile.about_me}</p>
            </Card>
          )}

          {/* Edit Button */}
          <Button 
            className="w-full h-12 text-base font-medium"
            onClick={() => setIsEditModalOpen(true)}
          >
            Editar Perfil
          </Button>
          
          {/* Provider sync button */}
          {user.role === 'provider' && (
            <Button 
              variant="outline"
              className="w-full"
              onClick={forceFullSync}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar todas las secciones
            </Button>
          )}
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

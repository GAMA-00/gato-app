
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Edit, User, Mail, Phone, Building } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';

const Profile = () => {
  const { user } = useAuth();

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
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback className="text-2xl">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground capitalize">{user.role}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              
              {user.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              
              {user.condominiumName && (
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <span>{user.condominiumName}</span>
                  {user.houseNumber && <span>- Casa {user.houseNumber}</span>}
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <Button className="w-full">
                <Edit className="mr-2 h-4 w-4" />
                Editar Perfil
              </Button>
            </div>
          </Card>
        </div>
      </PageContainer>
    </>
  );
};

export default Profile;

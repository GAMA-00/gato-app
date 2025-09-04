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
  console.log('TeamPhotoSection - providerId:', providerId);
  
  const { data: teamMembers = [], isLoading, error } = useQuery({
    queryKey: ['team-members-photos', providerId],
    queryFn: async () => {
      console.log('TeamPhotoSection - Fetching team members for provider:', providerId);
      
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('provider_id', providerId)
        .order('position_order', { ascending: true });

      if (error) {
        console.error('TeamPhotoSection - Error fetching team members:', error);
        throw error;
      }
      
      console.log('TeamPhotoSection - Raw data from database:', data);
      
      // Transform database fields to match TeamMember interface
      const transformedMembers = data.map(member => {
        console.log('TeamPhotoSection - Processing member:', {
          id: member.id,
          name: member.name,
          photo_url_raw: member.photo_url,
          photo_url_type: typeof member.photo_url
        });
        
        return {
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
        };
      }) as TeamMember[];
      
      console.log('TeamPhotoSection - Transformed members:', transformedMembers);
      return transformedMembers;
    },
    enabled: !!providerId,
  });

  console.log('TeamPhotoSection - Final teamMembers:', teamMembers);
  console.log('TeamPhotoSection - isLoading:', isLoading);
  console.log('TeamPhotoSection - error:', error);

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
    console.log('TeamPhotoSection - Still loading...');
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Cargando información del equipo...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('TeamPhotoSection - Error state:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Equipo de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-500">
              Error al cargar información del equipo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create team leader from provider info
  const teamLeader = providerInfo ? {
    id: providerInfo.id,
    name: providerInfo.name || 'Proveedor',
    photoUrl: providerInfo.avatar_url,
    role: 'lider' as const
  } : null;

  // Only show auxiliary team members for clients, not the leader
  const allMembers = teamMembers;

  console.log('TeamPhotoSection - About to render with members:', allMembers);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Equipo de Trabajo
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allMembers.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Proveedor individual - trabaja solo
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {allMembers.map((member) => {
                console.log('TeamPhotoSection - Rendering member:', {
                  id: member.id,
                  name: member.name,
                  photoUrl: member.photoUrl,
                  hasPhoto: !!member.photoUrl
                });
                
                return (
                  <div key={member.id} className="text-center">
                    <EnhancedAvatar
                      src={member.photoUrl}
                      alt={member.name}
                      fallback={member.name ? member.name.substring(0, 2).toUpperCase() : 'AU'}
                      className="w-16 h-16 mx-auto mb-2"
                      onError={() => console.error('TeamPhotoSection - Avatar error for:', member.name, 'URL:', member.photoUrl)}
                      onLoad={() => console.log('TeamPhotoSection - Avatar loaded for:', member.name, 'URL:', member.photoUrl)}
                    />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Auxiliar
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamPhotoSection;
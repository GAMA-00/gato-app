import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { uploadTeamMemberPhoto } from '@/utils/uploadService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTeamMemberPhotoUpload = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      memberId, 
      photoFile, 
      providerId 
    }: { 
      memberId: string; 
      photoFile: File; 
      providerId: string;
    }) => {
      console.log("=== UPLOADING TEAM MEMBER PHOTO ===");
      console.log("Member ID:", memberId);
      console.log("Provider ID:", providerId);

      // Upload the photo
      const uploadResult = await uploadTeamMemberPhoto(photoFile, providerId, memberId);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Error uploading photo');
      }

      console.log("✅ Photo uploaded successfully:", uploadResult.url);

      // Update the database with the photo URL
      const { error } = await supabase
        .from('team_members')
        .update({ photo_url: uploadResult.url })
        .eq('id', memberId);

      if (error) {
        console.error("Error updating photo URL in database:", error);
        throw new Error('Error updating photo in database');
      }

      console.log("✅ Database updated with photo URL");
      return { url: uploadResult.url, memberId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', user?.id] });
      console.log("✅ Photo upload process completed for member:", data.memberId);
    },
    onError: (error) => {
      console.error('Error in photo upload process:', error);
      toast.error('Error al subir la foto del miembro');
    }
  });
};
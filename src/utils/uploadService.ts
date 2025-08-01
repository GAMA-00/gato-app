
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// DEPRECATED: Avatar upload now handled by unifiedAvatarUpload.ts
// This function is kept only for backwards compatibility and will be removed
export const uploadAvatar = async (file: File, userId: string): Promise<UploadResult> => {
  console.warn('⚠️ uploadAvatar is DEPRECATED. Use unifiedAvatarUpload instead.');
  throw new Error('uploadAvatar is deprecated. Use unifiedAvatarUpload from @/utils/unifiedAvatarUpload');
};

export const uploadCertificationFiles = async (files: File[], userId: string): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/certifications/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('certifications')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('certifications')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrlData.publicUrl);
    } catch (error) {
      console.error('Error uploading certification file:', error);
      toast.error(`Error al subir ${file.name}`);
    }
  }
  
  return uploadedUrls;
};

export const uploadTeamMemberPhoto = async (file: File, userId: string, memberId: string): Promise<UploadResult> => {
  try {
    console.log('=== Uploading team member photo ===');
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten archivos de imagen');
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/team/${memberId}.${fileExt}`;
    
    // Ensure proper content type
    let contentType = file.type;
    if (!contentType || contentType === 'application/json') {
      // Fallback based on extension
      if (fileExt === 'jpg' || fileExt === 'jpeg') {
        contentType = 'image/jpeg';
      } else if (fileExt === 'png') {
        contentType = 'image/png';
      } else if (fileExt === 'webp') {
        contentType = 'image/webp';
      } else {
        contentType = 'image/jpeg'; // default
      }
    }
    
    console.log('Team photo upload details:', { fileName, fileType: file.type, contentType, fileExt });
    
    // Delete existing photo
    const { error: deleteError } = await supabase.storage
      .from('team-photos')
      .remove([fileName]);
    
    if (deleteError) {
      console.warn('Could not delete existing team photo:', deleteError);
    }

    const { data, error } = await supabase.storage
      .from('team-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('team-photos')
      .getPublicUrl(fileName);

    console.log('Team photo uploaded successfully:', publicUrlData.publicUrl);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (error: any) {
    console.error('Error uploading team photo:', error);
    return { success: false, error: error.message };
  }
};

export const uploadGalleryImages = async (files: File[], userId: string): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  
  for (const file of files) {
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${userId}/gallery/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('service-gallery')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('service-gallery')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrlData.publicUrl);
    } catch (error) {
      console.error('Error uploading gallery image:', error);
      toast.error(`Error al subir imagen`);
    }
  }
  
  return uploadedUrls;
};

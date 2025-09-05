
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
    console.log('Upload details:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      userId, 
      memberId 
    });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten archivos de imagen');
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('El archivo debe ser menor a 5MB');
    }
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const timestamp = Date.now();
    const fileName = `${userId}/team/${memberId}_${timestamp}.${fileExt}`;
    
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
    
    console.log('Final upload details:', { fileName, contentType, fileExt });
    
    // Delete any existing photos for this member
    const { data: existingFiles } = await supabase.storage
      .from('team-photos')
      .list(`${userId}/team/`);
    
    if (existingFiles) {
      const memberFiles = existingFiles.filter(f => f.name.startsWith(`${memberId}_`));
      if (memberFiles.length > 0) {
        const filesToDelete = memberFiles.map(f => `${userId}/team/${f.name}`);
        console.log('Deleting existing files:', filesToDelete);
        const { error: deleteError } = await supabase.storage
          .from('team-photos')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.warn('Could not delete existing team photos:', deleteError);
        }
      }
    }

    const { data, error } = await supabase.storage
      .from('team-photos')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('team-photos')
      .getPublicUrl(fileName);

    const finalUrl = publicUrlData.publicUrl;
    console.log('Team photo uploaded successfully:', finalUrl);
    
    // Test the uploaded image
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log('Upload verification: Image loads correctly');
        resolve({ success: true, url: finalUrl });
      };
      img.onerror = () => {
        console.error('Upload verification: Image failed to load');
        resolve({ success: true, url: finalUrl }); // Still return success, might be CORS issue
      };
      img.src = finalUrl;
      
      // Timeout after 5 seconds
      setTimeout(() => {
        resolve({ success: true, url: finalUrl });
      }, 5000);
    });
    
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


import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export const uploadAvatar = async (file: File, userId: string): Promise<UploadResult> => {
  try {
    console.log('=== Uploading avatar ===');
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/avatar.${fileExt}`;
    
    // Delete existing avatar
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([fileName]);
    
    if (deleteError) {
      console.warn('Could not delete existing avatar:', deleteError);
    }

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    console.log('Avatar uploaded successfully:', publicUrlData.publicUrl);
    return { success: true, url: publicUrlData.publicUrl };
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    return { success: false, error: error.message };
  }
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

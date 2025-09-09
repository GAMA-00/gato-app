
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
    console.log('🔵 Team Member Photo Upload Started:', { 
      fileName: file.name, 
      fileType: file.type, 
      fileSize: file.size,
      userId,
      memberId
    });

    // Validaciones básicas
    if (!file.type.startsWith('image/')) {
      throw new Error('Debe ser una imagen');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Imagen debe ser menor a 5MB');
    }

    // Convertir a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    console.log('🔄 ArrayBuffer conversion successful, size:', arrayBuffer.byteLength);

    // Nombre consistente: userId/team/memberId.jpg 
    const fileName = `${userId}/team/${memberId}.jpg`;
    
    // 1. Borrar fotos anteriores (incluyendo temporales)
    const { data: existingFiles } = await supabase.storage
      .from('team-photos')
      .list(`${userId}/team`);
      
    if (existingFiles) {
      const filesToDelete = existingFiles
        .filter(file => file.name.includes(memberId))
        .map(file => `${userId}/team/${file.name}`);
        
      if (filesToDelete.length > 0) {
        await supabase.storage.from('team-photos').remove(filesToDelete);
        console.log('🗑️ Deleted previous photos:', filesToDelete);
      }
    }

    // 2. Subir usando ArrayBuffer
    const { data, error: uploadError } = await supabase.storage
      .from('team-photos')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg' // Forzar JPEG
      });

    if (uploadError) {
      console.error('❌ Error upload:', uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }

    console.log('✅ Upload exitoso:', data);

    // 3. Generar URL consistente como los avatares (sin URLs completas)
    const photoUrl = `team-photos/${fileName}`;
    console.log('🔗 URL relativa generada:', photoUrl);

    console.log('✅ Team member photo upload completo exitoso');
    return { success: true, url: photoUrl };
    
  } catch (error: any) {
    console.error('💥 Error general en team photo upload:', error);
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

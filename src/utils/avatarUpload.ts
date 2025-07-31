import { supabase } from '@/integrations/supabase/client';

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('=== Avatar upload using gallery logic ===');
    
    // Validate file type (exact same as gallery)
    if (!file.type.startsWith('image/')) {
      throw new Error('El archivo debe ser una imagen');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen debe ser menor a 5MB');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    // Use same pattern as gallery: userId/avatar-timestamp.ext
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    console.log('Avatar upload details:', { fileName, fileType: file.type, fileExt });

    // Upload to service-gallery bucket (same as gallery images)
    const { data, error } = await supabase.storage
      .from('service-gallery')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Upload error:', error);
      throw new Error('Error al subir la imagen');
    }

    // Get public URL (same as gallery)
    const { data: urlData } = supabase.storage
      .from('service-gallery')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log('Avatar uploaded successfully:', avatarUrl);

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error('Error al actualizar el perfil');
    }

    return avatarUrl;
  } catch (error: any) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
};
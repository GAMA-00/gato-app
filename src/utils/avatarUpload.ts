import { supabase } from '@/integrations/supabase/client';

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('=== Avatar upload - Enhanced version ===');
    console.log('File details:', { 
      name: file.name, 
      type: file.type, 
      size: file.size,
      lastModified: file.lastModified 
    });
    
    // Validate file type with more specific checks
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!file.type || !allowedTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type);
      throw new Error('El archivo debe ser una imagen válida (JPEG, PNG o WebP)');
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      throw new Error('La imagen debe ser menor a 5MB');
    }

    // Validate file is not empty
    if (file.size === 0) {
      console.error('Empty file detected');
      throw new Error('El archivo está vacío');
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (!fileExt || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
      console.error('Invalid file extension:', fileExt);
      throw new Error('Extensión de archivo no válida');
    }

    // Single avatar per user: userId/avatar.ext
    const fileName = `${userId}/avatar.${fileExt}`;

    console.log('Avatar upload attempt:', { 
      fileName, 
      fileType: file.type, 
      fileExt,
      userId 
    });

    // Delete existing avatar first to avoid conflicts
    try {
      const { error: deleteError } = await supabase.storage
        .from('avatars')
        .remove([fileName]);
      
      if (deleteError) {
        console.log('No existing avatar to delete or deletion failed:', deleteError.message);
      } else {
        console.log('Existing avatar deleted successfully');
      }
    } catch (deleteErr) {
      console.log('Delete attempt failed (non-critical):', deleteErr);
    }

    // Upload to avatars bucket with explicit MIME type preservation
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type, // Explicitly preserve MIME type
        duplex: 'half'
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log('Avatar URL generated:', avatarUrl);

    // Verify the file was uploaded correctly by checking its metadata
    try {
      const { data: fileInfo, error: infoError } = await supabase.storage
        .from('avatars')
        .list(userId, { limit: 10 });
        
      if (!infoError && fileInfo) {
        const uploadedFile = fileInfo.find(f => f.name === `avatar.${fileExt}`);
        console.log('Uploaded file verification:', uploadedFile);
      }
    } catch (verifyError) {
      console.log('File verification failed (non-critical):', verifyError);
    }

    // Update user profile with new avatar URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw new Error(`Error al actualizar el perfil: ${updateError.message}`);
    }

    console.log('Avatar upload and profile update completed successfully');
    return avatarUrl;
  } catch (error: any) {
    console.error('Avatar upload failed:', error);
    throw error;
  }
};
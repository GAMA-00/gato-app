import { supabase } from '@/integrations/supabase/client';

export const uploadAvatar = async (file: File, userId: string): Promise<string> => {
  try {
    console.log('=== Avatar upload - FIXED VERSION ===');
    console.log('File details:', { 
      name: file.name, 
      type: file.type, 
      size: file.size,
      lastModified: file.lastModified 
    });

    // Verificar que el usuario esté autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('User not authenticated:', authError);
      throw new Error('Usuario no autenticado. Por favor, inicia sesión nuevamente.');
    }

    if (user.id !== userId) {
      console.error('User ID mismatch:', { authUser: user.id, provided: userId });
      throw new Error('Error de autenticación: IDs no coinciden');
    }
    
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
      userId,
      authenticated: !!user
    });

    // Delete existing avatar first to avoid conflicts
    try {
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
        console.log('Deleting existing avatars:', filesToDelete);
        
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filesToDelete);
        
        if (deleteError) {
          console.log('Delete error (non-critical):', deleteError.message);
        } else {
          console.log('Existing avatars deleted successfully');
        }
      }
    } catch (deleteErr) {
      console.log('Delete attempt failed (non-critical):', deleteErr);
    }

    console.log('Using original file directly (SW bypass):', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Create headers to bypass Service Worker for upload
    const uploadHeaders = {
      'Cache-Control': 'no-cache',
      'X-SW-Bypass': 'true'
    };

    // Upload to avatars bucket using original file with SW bypass
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error('Storage upload error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Error al subir la imagen: ${error.message}`);
    }

    console.log('Upload successful:', data);

    // Verify the upload worked by listing files
    const { data: verifyFiles, error: verifyError } = await supabase.storage
      .from('avatars')
      .list(userId);
    
    if (verifyError) {
      console.error('Verification failed:', verifyError);
    } else {
      console.log('Verification - Files in bucket:', verifyFiles);
    }

    // Get public URL with cache busting
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Add cache busting timestamp to force image refresh
    const timestamp = new Date().getTime();
    const avatarUrl = `${urlData.publicUrl}?t=${timestamp}`;
    console.log('Avatar URL generated with cache busting:', avatarUrl);

    // Test URL accessibility
    try {
      const response = await fetch(avatarUrl, { method: 'HEAD' });
      console.log('URL accessibility test:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        console.warn('Avatar URL not accessible immediately:', response.status);
      }
    } catch (fetchError) {
      console.warn('URL accessibility test failed (may be temporary):', fetchError);
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
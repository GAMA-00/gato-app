import { supabase } from '@/integrations/supabase/client';

export const unifiedAvatarUpload = async (file: File, userId: string): Promise<string> => {
  console.log('🔵 Unified Avatar Upload iniciado:', { 
    fileName: file.name, 
    fileType: file.type, 
    fileSize: file.size,
    userId 
  });

  // Validaciones básicas igual que la galería
  if (!file.type.startsWith('image/')) {
    throw new Error('Debe ser una imagen');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Imagen debe ser menor a 5MB');
  }

  // Convertir a ArrayBuffer como la galería exitosa
  const arrayBuffer = await file.arrayBuffer();
  console.log('🔄 ArrayBuffer conversion successful, size:', arrayBuffer.byteLength);

  // Nombre consistente: userId/avatar.jpg
  const fileName = `${userId}/avatar.jpg`;
  
  try {
    // 1. Borrar avatar anterior si existe
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([fileName]);
    
    if (deleteError) {
      console.log('⚠️ No se pudo borrar avatar anterior:', deleteError.message);
    }

    // 2. Subir usando ArrayBuffer como la galería
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, arrayBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg' // Forzar JPEG como la galería
      });

    if (uploadError) {
      console.error('❌ Error upload:', uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }

    console.log('✅ Upload exitoso:', data);

    // 3. Obtener URL pública con cache busting
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    // Cache busting como la galería exitosa
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    console.log('🔗 URL generada con cache busting:', avatarUrl);

    // 4. Actualizar BD
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error BD:', updateError);
      throw new Error('Error guardando en base de datos');
    }

    console.log('✅ Avatar unificado completo exitoso');
    return avatarUrl;
    
  } catch (error) {
    console.error('💥 Error general en unified upload:', error);
    throw error;
  }
};
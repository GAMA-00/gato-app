import { supabase } from '@/integrations/supabase/client';

export const uploadAvatarSimple = async (file: File, userId: string): Promise<string> => {
  console.log('🔵 Upload simple iniciado:', { 
    fileName: file.name, 
    fileType: file.type, 
    fileSize: file.size,
    userId 
  });

  // Validaciones básicas
  if (!file.type.startsWith('image/')) {
    throw new Error('Debe ser una imagen');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Imagen debe ser menor a 5MB');
  }

  // Nombre simple: userId/avatar.jpg (siempre jpg)
  const fileName = `${userId}/avatar.jpg`;
  
  try {
    // 1. Borrar avatar anterior si existe
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([fileName]);
    
    if (deleteError) {
      console.log('⚠️ No se pudo borrar avatar anterior:', deleteError.message);
    }

    // 2. Subir nuevo avatar
    const { data, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error upload:', uploadError);
      throw new Error(`Error subiendo imagen: ${uploadError.message}`);
    }

    console.log('✅ Upload exitoso:', data);

    // 3. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;
    console.log('🔗 URL generada:', avatarUrl);

    // 4. Actualizar BD
    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('❌ Error BD:', updateError);
      throw new Error('Error guardando en base de datos');
    }

    console.log('✅ Avatar completo exitoso');
    return avatarUrl;
    
  } catch (error) {
    console.error('💥 Error general:', error);
    throw error;
  }
};
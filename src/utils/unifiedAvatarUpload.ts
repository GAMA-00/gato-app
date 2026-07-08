import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/**
 * Sube un avatar al bucket "avatars" y actualiza users.avatar_url via RPC.
 * Retorna la URL pública.
 */
export const unifiedAvatarUpload = async (file: File, userId: string): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Debe ser una imagen (JPG, PNG, WebP)');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen debe ser menor a 5 MB');
  }

  // Verificar sesión activa
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error('Sesión no activa — iniciá sesión para subir una foto');
  }

  const fileName = `${userId}/avatar.jpg`;

  // Subir File directamente (más confiable que ArrayBuffer)
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[unifiedAvatarUpload] Storage upload error:', uploadError);
    throw new Error(`Error subiendo la imagen: ${uploadError.message}`);
  }

  console.log('[unifiedAvatarUpload] Upload ok:', uploadData?.path);

  // URL pública con cache-busting
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
  console.log('[unifiedAvatarUpload] Public URL:', avatarUrl);

  // Actualizar DB via RPC SECURITY DEFINER (bypasses RLS)
  const { error: rpcError } = await db.rpc('update_my_avatar_url', {
    p_avatar_url: avatarUrl,
  });

  if (rpcError) {
    console.error('[unifiedAvatarUpload] RPC error:', rpcError);
    throw new Error(`Error guardando en base de datos: ${rpcError.message}`);
  }

  console.log('[unifiedAvatarUpload] DB updated successfully');
  return avatarUrl;
};

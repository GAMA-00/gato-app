import { supabase } from '@/integrations/supabase/client';

export const fixAvatarMimeTypes = async () => {
  try {
    console.log('=== Running avatar MIME type fix ===');
    
    // Call the database function to fix MIME types
    const { data, error } = await supabase.rpc('fix_avatar_mime_types');
    
    if (error) {
      console.error('Error fixing avatar MIME types:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Successfully fixed ${data} avatar MIME types`);
    return { success: true, fixedCount: data };
  } catch (error: any) {
    console.error('Exception fixing avatar MIME types:', error);
    return { success: false, error: error.message };
  }
};

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const createUserProfile = async (userId: string, userData: any) => {
  try {
    console.log('Creating profile for user with ID:', userId);
    console.log('User data for profile:', userData);
    
    let avatarUrl = null;
    if (userData.avatarFile) {
      console.log('Processing user avatar...');
      try {
        const { data: bucketData, error: bucketError } = await supabase
          .storage
          .getBucket('avatars');
        
        if (bucketError) {
          console.log('Creating avatars bucket...');
          await supabase.storage.createBucket('avatars', {
            public: true,
            fileSizeLimit: 5242880
          });
        }
        
        const fileExt = userData.avatarFile.name.split('.').pop();
        const filePath = `${userId}/avatar.${fileExt}`;
        
        console.log('Uploading avatar to Storage:', filePath);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, userData.avatarFile, {
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          toast.error('Error uploading profile image');
        } else {
          console.log('Avatar uploaded successfully:', uploadData);
          
          const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);
          
          avatarUrl = urlData.publicUrl;
          console.log('Avatar URL:', avatarUrl);
        }
      } catch (error) {
        console.error('Error processing avatar:', error);
        toast.error('Error processing profile image');
      }
    }
    
    const profileData = {
      id: userId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      residencia_id: userData.residenciaId || userData.providerResidenciaIds?.[0] || null,
      has_payment_method: false,
      avatar_url: avatarUrl
    };
    
    console.log('Final profile object to insert:', profileData);
    
    const { error } = await supabase
      .from('profiles')
      .upsert([profileData], { onConflict: 'id' });

    if (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
    
    console.log('Profile created successfully');
    return { success: true };
  } catch (error: any) {
    console.error('Error in createUserProfile:', error);
    return { success: false, error: error.message || 'Error creating user profile' };
  }
};


import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'client' | 'provider';
  avatar_url?: string;
  condominium_name?: string;
  condominium_text?: string;
  house_number?: string;
  about_me?: string;
  experience_years?: number;
  certification_files?: any[];
  created_at?: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      console.log('useUserProfile: Fetching user profile');
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.log('useUserProfile: Error fetching profile (non-critical):', error.message);
          // Return null instead of throwing to make it non-blocking
          return null;
        }

        console.log('useUserProfile: Profile fetched successfully');
        return data as UserProfile;
      } catch (err) {
        console.log('useUserProfile: Exception fetching profile (non-critical):', err);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry on failure to avoid blocking
  });

  const invalidateProfile = () => {
    queryClient.invalidateQueries({ queryKey: ['user-profile', user?.id] });
  };

  return {
    profile,
    isLoading,
    error,
    refetch,
    invalidateProfile
  };
};

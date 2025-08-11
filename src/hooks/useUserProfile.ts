
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { UserProfile } from '@/contexts/auth/types';


type UserProfileEx = UserProfile & {
  condominium_text?: string;
  certification_files?: any[];
};

export const useUserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery<UserProfileEx | null>({
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
        return data as UserProfileEx;
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

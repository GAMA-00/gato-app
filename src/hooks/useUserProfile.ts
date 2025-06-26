
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

      console.log('=== Fetching user profile ===');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        throw error;
      }

      console.log('User profile fetched:', data);
      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
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

import type { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserProfile } from './types';
import { supabase } from '@/integrations/supabase/client';

export const createUserFromSession = (authUser: SupabaseUser): User => {
  const role = authUser.user_metadata?.role || 'client';
  
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
    email: authUser.email || '',
    role: role === 'provider' ? 'provider' : 'client',
    avatar_url: authUser.user_metadata?.avatar_url || '',
    phone: authUser.user_metadata?.phone || ''
  };
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    console.log('AuthContext: Fetching user profile for:', userId);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.log('AuthContext: Profile fetch error (non-blocking):', error.message);
      return null;
    }

    console.log('AuthContext: Profile fetched successfully');
    return data as UserProfile;
  } catch (error) {
    console.log('AuthContext: Profile fetch exception (non-blocking):', error);
    return null;
  }
};

export const clearSupabaseStorage = () => {
  try {
    console.log('AuthContext: Clearing Supabase storage');
    
    const supabasePatterns = [
      'supabase.auth.',
      'sb-',
      'supabase-auth-token',
      'supabase_auth_token',
      'sb-auth-token',
      'supabase.session',
      'sb-session'
    ];
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const shouldRemove = supabasePatterns.some(pattern => key.includes(pattern));
        if (shouldRemove) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => {
      console.log('AuthContext: Removing localStorage key:', key);
      localStorage.removeItem(key);
    });
    
    const sessionKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const shouldRemove = supabasePatterns.some(pattern => key.includes(pattern));
        if (shouldRemove) {
          sessionKeysToRemove.push(key);
        }
      }
    }
    
    sessionKeysToRemove.forEach(key => {
      console.log('AuthContext: Removing sessionStorage key:', key);
      sessionStorage.removeItem(key);
    });
    
  } catch (error) {
    console.error('AuthContext: Error clearing storage:', error);
  }
};

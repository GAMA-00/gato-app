import type { User as SupabaseUser } from '@supabase/supabase-js';
import { User, UserProfile } from './types';
import { supabase } from '@/integrations/supabase/client';
import { authLogger } from '@/utils/logger';

export const createUserFromSession = (authUser: SupabaseUser): User => {
  const role = authUser.user_metadata?.role || 'client';
  
  return {
    id: authUser.id,
    name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuario',
    email: authUser.email || '',
    role: role === 'admin' ? 'admin' : (role === 'provider' ? 'provider' : 'client'),
    avatar_url: authUser.user_metadata?.avatar_url || '',
    phone: authUser.user_metadata?.phone || ''
  };
};

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    authLogger.debug('Fetching user profile', { userId });
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      authLogger.warn('Profile fetch error (non-blocking)', { message: error.message });
      return null;
    }

    authLogger.info('Profile fetched successfully');
    return data as UserProfile;
  } catch (error) {
    authLogger.warn('Profile fetch exception (non-blocking)', error);
    return null;
  }
};

export const clearSupabaseStorage = () => {
  try {
    authLogger.debug('Clearing Supabase storage');
    
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
      authLogger.debug('Removing localStorage key', { key });
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
      authLogger.debug('Removing sessionStorage key', { key });
      sessionStorage.removeItem(key);
    });
    
  } catch (error) {
    authLogger.error('Error clearing storage', error);
  }
};

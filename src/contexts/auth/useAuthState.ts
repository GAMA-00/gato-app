
import { useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, UserProfile } from './types';
import { logger } from '@/utils/logger';

export const useAuthState = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isLoggingOutRef = useRef(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();

  const updateUserPaymentMethod = (hasPayment: boolean) => {
    if (user) {
      logger.info('Payment method updated', { hasPayment });
    }
  };

  const isAuthenticated = !!session && !!user && !isLoggingOutRef.current;

  return {
    user,
    setUser,
    profile,
    setProfile,
    session,
    setSession,
    isLoading,
    setIsLoading,
    isLoggingOutRef,
    initTimeoutRef,
    updateUserPaymentMethod,
    isAuthenticated
  };
};

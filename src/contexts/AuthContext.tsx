
import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { useAuthActions } from './auth/useAuthActions';
import { createUserFromSession, fetchUserProfile } from './auth/utils';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
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
  } = useAuthState();

  const { login, logout } = useAuthActions(
    setUser,
    setProfile,
    setSession,
    setIsLoading,
    isLoggingOutRef
  );

  useEffect(() => {
    console.log('AuthContext: Initializing authentication');
    
    // Timeout de seguridad para evitar carga infinita
    initTimeoutRef.current = setTimeout(() => {
      console.log('AuthContext: Initialization timeout - forcing completion');
      setIsLoading(false);
    }, 5000); // Reducido a 5 segundos
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('AuthContext: Auth state changed -', event, !!currentSession, 'isLoggingOut:', isLoggingOutRef.current);
        
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = undefined;
        }
        
        if (isLoggingOutRef.current) {
          console.log('AuthContext: Ignoring auth event during logout process');
          return;
        }
        
        if (event === 'SIGNED_OUT' || !currentSession) {
          console.log('AuthContext: User signed out, clearing state');
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession?.user) {
          console.log('AuthContext: Setting user from session, event:', event);
          setSession(currentSession);
          const userData = createUserFromSession(currentSession.user);
          setUser(userData);
          
          // Cargar perfil en segundo plano de manera no bloqueante
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id).then(userProfile => {
              if (userProfile && !isLoggingOutRef.current) {
                setProfile(userProfile);
              }
            }).catch(error => {
              console.log('AuthContext: Non-blocking profile fetch failed:', error);
            });
          }, 0);
          
          console.log('AuthContext: User set successfully:', userData.role);
        }
        
        setIsLoading(false);
      }
    );

    // Verificar sesión existente
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      console.log('AuthContext: Initial session check -', !!currentSession, 'isLoggingOut:', isLoggingOutRef.current);
      
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = undefined;
      }
      
      if (!isLoggingOutRef.current) {
        if (currentSession?.user) {
          console.log('AuthContext: Setting initial session');
          setSession(currentSession);
          const userData = createUserFromSession(currentSession.user);
          setUser(userData);
          
          // Cargar perfil de manera no bloqueante
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id).then(userProfile => {
              if (userProfile && !isLoggingOutRef.current) {
                setProfile(userProfile);
              }
            }).catch(error => {
              console.log('AuthContext: Non-blocking initial profile fetch failed:', error);
            });
          }, 0);
          
          console.log('AuthContext: Initial user set:', userData.role);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      }
      
      setIsLoading(false);
    }).catch(error => {
      console.error('AuthContext: Error getting initial session:', error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  console.log('AuthContext: Current state -', { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user, 
    hasSession: !!session,
    hasProfile: !!profile,
    userRole: user?.role,
    isLoggingOut: isLoggingOutRef.current
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile,
      isAuthenticated,
      login,
      logout,
      isLoading,
      updateUserPaymentMethod
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Re-export types for convenience
export type { User, UserProfile } from './auth/types';

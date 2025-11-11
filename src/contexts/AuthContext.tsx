
/**
 * ⚠️ DO_NOT_CHANGE_BEHAVIOR ⚠️
 * Este archivo maneja autenticación, sesiones y roles de usuario.
 * Solo se permiten refactors no funcionales previamente aprobados.
 * Cualquier cambio en flujo debe tener aprobación explícita + tests en staging.
 */

import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType } from './auth/types';
import { useAuthState } from './auth/useAuthState';
import { useAuthActions } from './auth/useAuthActions';
import { createUserFromSession, fetchUserProfile } from './auth/utils';
import { authLogger } from '@/utils/logger';

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
    authLogger.info('Initializing authentication');
    
    // Timeout de seguridad para evitar carga infinita
    initTimeoutRef.current = setTimeout(() => {
      authLogger.warn('Initialization timeout - forcing completion');
      setIsLoading(false);
    }, 5000); // Reducido a 5 segundos
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        authLogger.debug('Auth state changed', { event, hasSession: !!currentSession, isLoggingOut: isLoggingOutRef.current });
        
        if (initTimeoutRef.current) {
          clearTimeout(initTimeoutRef.current);
          initTimeoutRef.current = undefined;
        }
        
        if (isLoggingOutRef.current) {
          authLogger.debug('Ignoring auth event during logout process');
          return;
        }
        
        if (event === 'SIGNED_OUT' || !currentSession) {
          authLogger.info('User signed out, clearing state');
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          return;
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && currentSession?.user) {
          authLogger.info('Setting user from session', { event });
          setSession(currentSession);
          const userData = createUserFromSession(currentSession.user);
          setUser(userData);
          
          // Cargar perfil y asegurar rol desde el servidor antes de liberar la UI
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id)
              .then(userProfile => {
                if (!isLoggingOutRef.current) {
                  if (userProfile) {
                    setProfile(userProfile);
                    // Forzar rol desde base de datos para evitar cambios de perspectiva
                    if (userProfile.role && userProfile.role !== userData.role) {
                      setUser(prev => prev ? { ...prev, role: userProfile.role } : prev);
                    }
                  }
                }
              })
              .catch(error => {
                authLogger.error('Profile fetch failed', error);
              })
              .finally(() => {
                if (!isLoggingOutRef.current) {
                  setIsLoading(false);
                }
              });
          }, 0);
          
          authLogger.info('User set successfully', { role: userData.role });
        }
      }
    );

    // Verificar sesión existente
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      authLogger.debug('Initial session check', { hasSession: !!currentSession, isLoggingOut: isLoggingOutRef.current });
      
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = undefined;
      }
      
      if (!isLoggingOutRef.current) {
        if (currentSession?.user) {
          authLogger.info('Setting initial session');
          setSession(currentSession);
          const userData = createUserFromSession(currentSession.user);
          setUser(userData);
          
          // Cargar perfil y asegurar rol desde servidor
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id)
              .then(userProfile => {
                if (!isLoggingOutRef.current) {
                  if (userProfile) {
                    setProfile(userProfile);
                    if (userProfile.role && userProfile.role !== userData.role) {
                      setUser(prev => prev ? { ...prev, role: userProfile.role } : prev);
                    }
                  }
                }
              })
              .catch(error => {
                authLogger.error('Initial profile fetch failed', error);
              })
              .finally(() => {
                if (!isLoggingOutRef.current) {
                  setIsLoading(false);
                }
              });
          }, 0);
          
          authLogger.info('Initial user set', { role: userData.role });
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
      
    }).catch(error => {
      authLogger.error('Error getting initial session', error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  authLogger.debug('Current state', { 
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
      updateUserPaymentMethod,
      isLoggingOut: isLoggingOutRef.current // Exponer el estado de logout
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { checkPhoneExists } from '@/utils/phoneValidation';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Starting Supabase authentication setup');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User authenticated:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error fetching profile:', profileError);
              toast.error('Error loading user profile');
            }

            if (profile) {
              console.log('Profile retrieved:', profile);
              setAuthUser({
                id: session.user.id,
                email: profile.email || '',
                name: profile.name,
                phone: profile.phone || '',
                buildingId: profile.residencia_id || '',
                buildingName: '', 
                hasPaymentMethod: profile.has_payment_method || false,
                role: profile.role as UserRole,
                avatarUrl: profile.avatar_url 
              });
            } else {
              console.warn('No profile found for user:', session.user.id);
              toast.warning('User profile not found');
            }
          } catch (error) {
            console.error('Error processing profile:', error);
            toast.error('Error processing user profile');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          clearAuthUser();
        }
      }
    );

    const loadInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }
        
        if (session?.user) {
          console.log('Existing session found for:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error fetching initial profile:', profileError);
              return;
            }
            
            if (profile) {
              console.log('Initial profile loaded:', profile);
              setAuthUser({
                id: session.user.id,
                email: profile.email || '',
                name: profile.name,
                phone: profile.phone || '',
                buildingId: profile.residencia_id || '',
                buildingName: '', 
                hasPaymentMethod: profile.has_payment_method || false,
                role: profile.role as UserRole,
                avatarUrl: profile.avatar_url 
              });
            } else {
              console.warn('No initial profile found for user:', session.user.id);
            }
          } catch (error) {
            console.error('Error loading initial profile:', error);
          }
        } else {
          console.log('No active session');
        }
      } catch (error) {
        console.error('Error checking initial session:', error);
      }
    };

    loadInitialSession();

    return () => {
      console.log('Cleaning up authentication subscription');
      subscription.unsubscribe();
    };
  }, [setAuthUser, clearAuthUser]);

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Starting registration process with email:', email);
    setIsLoading(true);
    
    try {
      // Check for phone uniqueness
      if (userData.phone) {
        const phoneExists = await checkPhoneExists(userData.phone);
        
        if (phoneExists) {
          console.log('Phone number already registered');
          toast.error('Este número de teléfono ya está registrado. Por favor use un número diferente.');
          setIsLoading(false);
          return { 
            data: null, 
            error: new Error('Phone number already in use')
          };
        }
      }
      
      console.log('Attempting user registration with random username');
      
      // Create a random username for authentication to bypass email verification
      const randomUsername = `user_${Math.random().toString(36).substring(2, 15)}`;
      // Generate a simple password
      const randomPassword = Math.random().toString(36).substring(2, 15);
      
      const { data, error } = await supabase.auth.signUp({
        email: randomUsername,
        password: randomPassword
      });
      
      if (error) {
        console.error('User registration error:', error);
        toast.error(error.message || 'Error en el registro');
        return { data: null, error };
      }
      
      if (data?.user) {
        console.log('User created successfully:', data.user.id);
        
        // Create user profile with the actual email
        const profileData = {
          id: data.user.id,
          name: userData.name,
          email: email, // Store the real email
          phone: userData.phone || '',
          role: userData.role,
          residencia_id: userData.role === 'client' ? userData.residenciaId : null,
          has_payment_method: false
        };
        
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([profileData]);
        
        if (profileError) {
          console.error('Error creating profile:', profileError);
          toast.error('Error al crear el perfil de usuario');
          return { 
            data: null, 
            error: profileError 
          };
        }
        
        // Store the provider's residencia IDs if they're a provider
        if (userData.role === 'provider' && userData.providerResidenciaIds && userData.providerResidenciaIds.length > 0) {
          // Handle provider residencias if needed
          console.log('Provider residencias:', userData.providerResidenciaIds);
        }
        
        // Now sign in the user immediately
        await supabase.auth.signInWithPassword({
          email: randomUsername,
          password: randomPassword
        });
        
        console.log('User signed in successfully after registration');
        toast.success('¡Cuenta creada con éxito!');
        
        return { data, error: null };
      } else {
        console.error('No user data received after registration');
        toast.error('Error al crear cuenta');
        return { 
          data: null, 
          error: new Error('No se pudo crear el usuario')
        };
      }
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast.error(error.message || 'Error en el registro');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with email:', email);
      
      // Find the profile with this email
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', email);
      
      if (profilesError || !profiles || profiles.length === 0) {
        console.error('No profile found with this email:', email);
        toast.error('Usuario no encontrado. Por favor verifique su email.');
        return { data: null, error: new Error('User not found') };
      }
      
      // Try to authenticate using the user ID
      let authResult = null;
      
      for (const profile of profiles) {
        // Fetch the auth user associated with this profile ID
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
        
        if (user) {
          // Try signing in with that user's email
          const { data } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: password
          });
          
          if (data?.session) {
            authResult = data;
            break;
          }
        }
      }
      
      if (!authResult) {
        console.log('Login failed, incorrect credentials');
        toast.error('Error en las credenciales. Por favor verifique su email y contraseña.');
        return { data: null, error: new Error('Invalid credentials') };
      }
      
      console.log('Login successful:', authResult);
      return { data: authResult, error: null };
    } catch (error: any) {
      console.error('Login error caught:', error);
      toast.error('Error en el inicio de sesión');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearAuthUser();
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error(error.message);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    isLoading
  };
};

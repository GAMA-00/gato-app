
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { createUserProfile } from '@/utils/profileManagement';
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
                email: session.user.email || '',
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
                email: session.user.email || '',
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
      // Only check for phone uniqueness
      if (userData.phone) {
        const phoneExists = await checkPhoneExists(userData.phone);
        
        if (phoneExists) {
          console.log('Phone number already registered');
          toast.error('Este número de teléfono ya está registrado. Por favor use un número diferente.');
          return { 
            data: null, 
            error: new Error('Phone number already in use')
          };
        }
      }
      
      console.log('Attempting user registration:', email);
      
      // Generate a random suffix to make email unique in Supabase
      const randomSuffix = Math.random().toString(36).substring(2, 10);
      const uniqueEmail = `${email.split('@')[0]}+${randomSuffix}@${email.split('@')[1]}`;
      
      console.log('Using modified email for Supabase:', uniqueEmail);
      
      const { data, error } = await supabase.auth.signUp({
        email: uniqueEmail, // Use the unique email for Supabase
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            original_email: email // Store the original email in metadata
          }
        }
      });
      
      if (error) {
        console.error('User registration error:', error);
        toast.error(error.message || 'Registration error');
        return { data: null, error };
      }
      
      if (data?.user) {
        console.log('User created successfully:', data.user.id);
        
        await createUserProfile(data.user.id, {
          ...userData,
          email // Use the original email for the profile
        });
        
        toast.success('Account created successfully!');
        return { data, error: null };
      } else {
        console.error('No user data received after registration');
        toast.error('Error creating account');
        return { 
          data: null, 
          error: new Error('Could not create user')
        };
      }
    } catch (error: any) {
      console.error('Unexpected registration error:', error);
      toast.error(error.message || 'Registration error');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Attempting login with:', email);
      
      // First try exact email
      let result = await supabase.auth.signInWithPassword({ email, password });
      
      // If failed, try to find the account by querying profiles
      if (result.error) {
        console.log('Login failed with exact email, trying to find matching profile');
        
        // Find the profile with this email
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email);
        
        if (profilesError || !profiles || profiles.length === 0) {
          console.error('No profile found with this email:', profilesError || 'No profiles');
          toast.error('Error en las credenciales. Por favor verifique su email y contraseña.');
          throw result.error;
        }
        
        // Find the auth user related to this profile
        for (const profile of profiles) {
          // Try to login with the found user id's associated email
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.id);
          
          if (authUser?.user) {
            // Try login with the auth email
            result = await supabase.auth.signInWithPassword({
              email: authUser.user.email!,
              password
            });
            
            if (!result.error) break; // Successfully logged in
          }
        }
      }
      
      if (result.error) {
        console.error('Login error after all attempts:', result.error);
        toast.error('Error en las credenciales. Por favor verifique su email y contraseña.');
        throw result.error;
      }
      
      console.log('Login successful:', result.data);
      return { data: result.data, error: null };
    } catch (error: any) {
      console.error('Login error caught:', error);
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

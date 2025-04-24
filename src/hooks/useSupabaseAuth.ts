import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Iniciando setup de autenticación con Supabase');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticación:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Usuario autenticado:', session.user.id);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error al obtener perfil:', profileError);
          }

          if (profile) {
            console.log('Perfil obtenido:', profile);
            setAuthUser({
              id: session.user.id,
              email: session.user.email || '',
              name: profile.name,
              phone: profile.phone || '',
              buildingId: profile.residencia_id || '',
              buildingName: '', // You'll need to fetch this if needed
              hasPaymentMethod: profile.has_payment_method || false,
              role: profile.role as UserRole
            });
          } else {
            console.warn('No se encontró perfil para el usuario:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuario cerró sesión');
          clearAuthUser();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error al obtener sesión:', error);
      }
      
      if (session?.user) {
        console.log('Sesión existente encontrada para:', session.user.id);
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (profileError) {
              console.error('Error al obtener perfil en inicio:', profileError);
            }
            
            if (profile) {
              console.log('Perfil cargado en inicio:', profile);
              setAuthUser({
                id: session.user.id,
                email: session.user.email || '',
                name: profile.name,
                phone: profile.phone || '',
                buildingId: profile.residencia_id || '',
                buildingName: '', // You'll need to fetch this if needed
                hasPaymentMethod: profile.has_payment_method || false,
                role: profile.role as UserRole
              });
            } else {
              console.warn('No se encontró perfil para el usuario en inicio:', session.user.id);
            }
          });
      } else {
        console.log('No hay sesión activa');
      }
    });

    return () => {
      console.log('Limpiando suscripción de autenticación');
      subscription.unsubscribe();
    };
  }, [setAuthUser, clearAuthUser]);

  const createUserProfile = async (userId: string, userData: any) => {
    try {
      const profileObject = {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        residencia_id: userData.residenciaId || null,
        has_payment_method: false
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([profileObject]);

      if (profileError) {
        console.error('Error al crear perfil:', profileError);
        throw profileError;
      }

      return true;
    } catch (error: any) {
      console.error('Error al crear perfil:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando registro con datos:', { email, ...userData });
    
    if (isLoading) {
      throw new Error('Ya hay una solicitud en curso');
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
            residenciaId: userData.residenciaId
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('No se pudo crear el usuario');

      await createUserProfile(data.user.id, {
        ...userData,
        email: email
      });

      toast.success('Registro exitoso! Por favor verifica tu email para iniciar sesión.');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('Error en registro:', error);
      toast.error(error.message || 'Error durante el registro');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('Intentando iniciar sesión con:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Error en inicio de sesión:', error);
        if (error.message.includes('Email not confirmed')) {
          toast.error('Email no confirmado. Por favor revisa tu correo y confirma tu cuenta.');
        } else if (error.message.includes('Invalid login credentials')) {
          toast.error('Credenciales incorrectas. Verifica tu email y contraseña.');
        } else {
          toast.error(error.message || 'Error al iniciar sesión');
        }
        throw error;
      }
      
      console.log('Inicio de sesión exitoso:', data);
      return { data, error: null };
    } catch (error: any) {
      console.error('Error capturado en inicio de sesión:', error);
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

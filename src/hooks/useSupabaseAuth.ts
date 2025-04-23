
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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticación:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Usuario autenticado:', session.user.id);
          // Get user profile after sign in
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
              buildingId: profile.building_id || '',
              buildingName: '', // You'll need to fetch this if needed
              hasPaymentMethod: profile.has_payment_method || false,
              role: profile.role as UserRole // Usar aserción de tipo para garantizar que sea del tipo correcto
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

    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error al obtener sesión:', error);
      }
      
      if (session?.user) {
        console.log('Sesión existente encontrada para:', session.user.id);
        // Get user profile
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
                buildingId: profile.building_id || '',
                buildingName: '', // You'll need to fetch this if needed
                hasPaymentMethod: profile.has_payment_method || false,
                role: profile.role as UserRole // Usar aserción de tipo para garantizar que sea del tipo correcto
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

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Intentando registrar nuevo usuario:', email);
    console.log('Datos de usuario:', JSON.stringify(userData));
    
    setIsLoading(true);
    try {
      // Primero validamos que todos los datos necesarios estén presentes
      if (!email || !password || !userData.name || !userData.role) {
        throw new Error('Faltan datos requeridos para el registro');
      }

      console.log('Ejecutando signUp en Supabase con:', email);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });

      if (error) {
        console.error('Error en signUp de Supabase:', error);
        throw error;
      }

      console.log('Registro exitoso, respuesta de Supabase:', data);

      if (data.user) {
        console.log('Creando registro en tabla profiles para:', data.user.id);
        
        // IMPORTANTE: Asegurar que el building_id sea null si no es un UUID válido
        let buildingIdForProfile = null;
        
        // Intentamos buscar el UUID del edificio en la base de datos
        if (userData.buildingId) {
          console.log('Buscando información del edificio con ID:', userData.buildingId);
          const { data: buildingData, error: buildingError } = await supabase
            .from('buildings')
            .select('id')
            .eq('id', userData.buildingId)
            .single();
            
          if (buildingError) {
            console.error('Error al obtener edificio:', buildingError);
          } else if (buildingData) {
            console.log('Edificio encontrado:', buildingData);
            buildingIdForProfile = buildingData.id; // Usar el UUID del edificio de la DB
          }
        }
        
        console.log('ID de edificio para perfil:', buildingIdForProfile);
        
        // Create profile con RLS habilitado ahora
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              name: userData.name,
              email: email,
              phone: userData.phone || '',
              role: userData.role,
              building_id: buildingIdForProfile, // Usar el UUID correcto o null
              has_payment_method: false
            }
          ])
          .select();

        if (profileError) {
          console.error('Error al crear perfil de usuario:', profileError);
          throw profileError;
        }
        
        console.log('Perfil creado exitosamente:', profileData);
        toast.success('Registro exitoso! Por favor verifica tu email.');
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Error capturado en registro:', error);
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
        throw error;
      }
      
      console.log('Inicio de sesión exitoso:', data);
      return { data, error: null };
    } catch (error: any) {
      console.error('Error capturado en inicio de sesión:', error);
      toast.error(error.message || 'Error al iniciar sesión');
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

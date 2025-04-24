import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

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
    console.log('Intentando crear perfil para el usuario:', userId);
    console.log('Datos de perfil:', JSON.stringify(userData, null, 2));
    
    const profileObject = {
      id: userId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      residencia_id: userData.residenciaId || null,
      has_payment_method: false
    };
    
    console.log('Objeto de perfil a insertar:', JSON.stringify(profileObject, null, 2));
    
    try {
      // MÉTODO 1: Insert directo a la tabla profiles
      console.log('MÉTODO 1: Insertando directamente en la tabla profiles');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([profileObject])
        .select();

      if (profileError) {
        console.error('ERROR MÉTODO 1:', profileError);
        console.error('Código de error:', profileError.code);
        console.error('Mensaje de error:', profileError.message);
        console.error('Detalles:', profileError.details);
        
        // MÉTODO 2: Usar la función RPC
        console.log('MÉTODO 2: Intentando con función RPC create_user_profile');
        try {
          const { error: rpcError } = await supabase.rpc(
            'create_user_profile',
            {
              user_id: userId,
              user_name: userData.name,
              user_email: userData.email || '',
              user_phone: userData.phone || '',
              user_role: userData.role,
              user_residencia_id: userData.residenciaId || null
            }
          );
          
          if (rpcError) {
            console.error('ERROR MÉTODO 2 (RPC):', rpcError);
            throw rpcError;
          }
          
          console.log('MÉTODO 2: Perfil creado con éxito mediante RPC');
          return true;
        } catch (error: any) {
          console.error('ERROR MÉTODO 2 (catch):', error);
          return false;
        }
      }

      console.log('MÉTODO 1: Perfil creado con éxito:', profileData);
      return true;
    } catch (error: any) {
      console.error('Error general al crear perfil:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Inicio de signUp - email:', email);
    console.log('Inicio de signUp - userData:', JSON.stringify(userData));
    setIsLoading(true);
    
    try {
      // 1. Primero registrar el usuario en Authentication
      console.log('Enviando solicitud de registro a Supabase Auth con datos:', {
        email: email,
        userData: {
          name: userData.name,
          role: userData.role,
          phone: userData.phone,
          residenciaId: userData.residenciaId
        }
      });
      
      console.log('ANTES de supabase.auth.signUp');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone,
            residenciaId: userData.residenciaId,
            email: email
          },
        }
      });
      console.log('DESPUÉS de supabase.auth.signUp - resultado:', { data: !!data, error: error });

      if (error) {
        console.error('Error en signUp:', error);
        throw error;
      }

      if (!data.user) {
        console.error('No se recibió objeto de usuario tras registro');
        throw new Error('No se pudo crear el usuario');
      }

      console.log('Usuario creado exitosamente:', data.user);

      // 2. Crear el perfil una vez que tengamos el usuario
      console.log('ANTES de createUserProfile');
      const profileSuccess = await createUserProfile(data.user.id, {
        ...userData,
        email: email
      });
      console.log('DESPUÉS de createUserProfile - éxito:', profileSuccess);

      if (!profileSuccess) {
        console.warn('Se creó el usuario pero hubo problemas al crear el perfil');
      }

      console.log('Registro completado con éxito');
      toast.success('Registro exitoso! Por favor verifica tu email para iniciar sesión.');
      
      return { data, error: null };
    } catch (error: any) {
      console.error('Error en el proceso de registro:', error);
      toast.error(error.message || 'Error durante el registro');
      return { data: null, error };
    } finally {
      console.log('Setting isLoading to false');
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
        // Mensajes de error específicos para mejor experiencia de usuario
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

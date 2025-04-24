
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
    
    try {
      // Crear objeto de perfil para inserción
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
      
      // Insertar directamente en la tabla profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert([profileObject]);

      if (profileError) {
        console.error('Error al insertar perfil:', profileError);
        
        // Intento alternativo usando RPC
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
          console.error('Error en método RPC:', rpcError);
          throw rpcError;
        }
      }

      return true;
    } catch (error: any) {
      console.error('Error general al crear perfil:', error);
      return false;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('[signUp] Iniciando registro con email:', email);
    console.log('[signUp] Datos de usuario:', JSON.stringify(userData, null, 2));
    
    if (isLoading) {
      console.log('Ya hay una solicitud en curso, ignorando');
      return { data: null, error: new Error('Ya hay una solicitud en curso') };
    }
    
    setIsLoading(true);
    
    try {
      // 1. Registrar el usuario en Auth
      console.log('[signUp] Enviando solicitud a Supabase Auth');
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
      console.log('[signUp] Respuesta de signUp:', { success: !!data.user, error: error });

      if (error) {
        console.error('[signUp] Error en registro:', error);
        toast.error(error.message || 'Error durante el registro');
        return { data: null, error };
      }

      if (!data.user) {
        console.error('[signUp] No se recibió objeto de usuario tras registro');
        const noUserError = new Error('No se pudo crear el usuario');
        toast.error('No se pudo crear el usuario');
        return { data: null, error: noUserError };
      }

      console.log('[signUp] Usuario creado exitosamente:', data.user.id);

      // 2. Crear el perfil
      console.log('[signUp] Creando perfil para usuario:', data.user.id);
      const profileSuccess = await createUserProfile(data.user.id, {
        ...userData,
        email: email
      });
      console.log('[signUp] Resultado de creación de perfil:', profileSuccess);

      if (!profileSuccess) {
        console.warn('[signUp] Se creó el usuario pero hubo problemas al crear el perfil');
      }

      console.log('[signUp] Registro completado con éxito');
      toast.success('Registro exitoso! Por favor verifica tu email para iniciar sesión.');
      
      return { data, error: null };
    } catch (error: any) {
      console.error('[signUp] Error crítico en el proceso de registro:', error);
      toast.error(error.message || 'Error inesperado durante el registro');
      return { data: null, error };
    } finally {
      console.log('[signUp] Finalizando proceso de registro');
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


import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';

// Import constants from the Supabase client file
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
              buildingId: profile.building_id || '',
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
                buildingId: profile.building_id || '',
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

  // Mejorar la función signUp para garantizar la creación del perfil
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
        
        // Verificar si el buildingId es válido
        let buildingIdForProfile = null;
        
        if (userData.buildingId) {
          console.log('Verificando edificio con ID:', userData.buildingId);
          
          try {
            // Verificar si buildingId es un UUID válido
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const isValidUUID = uuidRegex.test(userData.buildingId);
            
            if (isValidUUID) {
              // Buscar el edificio en la base de datos
              const { data: buildingData, error: buildingError } = await supabase
                .from('buildings')
                .select('id')
                .eq('id', userData.buildingId)
                .single();
                
              if (buildingError) {
                console.error('Error al obtener edificio:', buildingError);
              } else if (buildingData) {
                console.log('Edificio encontrado:', buildingData);
                buildingIdForProfile = buildingData.id; // UUID válido del edificio
              }
            } else {
              console.warn('El buildingId no es un UUID válido:', userData.buildingId);
            }
          } catch (buildingErr) {
            console.error('Error al buscar edificio:', buildingErr);
          }
        }
        
        console.log('ID de edificio para perfil:', buildingIdForProfile);
        
        // Crear el objeto de perfil
        const profileObject = {
          id: data.user.id,
          name: userData.name,
          email: email,
          phone: userData.phone || '',
          role: userData.role,
          building_id: buildingIdForProfile,
          has_payment_method: false
        };
        
        console.log('Intentando crear perfil con datos:', profileObject);
        
        try {
          // Primer método: insert directo a la tabla profiles
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .insert([profileObject])
            .select();

          if (profileError) {
            console.error('Error al crear perfil de usuario:', profileError);
            
            // Segundo método: intentar usar la función RPC si falla el primero
            console.log('Intentando método alternativo para crear perfil...');
            
            // Usar la función RPC con type assertion para evitar errores de TypeScript
            const { error: rpcError } = await supabase.rpc(
              'create_user_profile' as any,
              {
                user_id: data.user.id,
                user_name: userData.name,
                user_email: email,
                user_phone: userData.phone || '',
                user_role: userData.role,
                user_building_id: buildingIdForProfile
              }
            );
            
            if (rpcError) {
              console.error('Error en método alternativo:', rpcError);
              
              // Tercer método: ejecutar una llamada REST directa usando la URL y key
              console.log('Intentando método final para crear perfil...');
              
              const adminResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify(profileObject)
              });
              
              if (!adminResponse.ok) {
                console.error('Error en método final:', await adminResponse.text());
                toast.warning('Cuenta creada pero hubo un problema con el perfil. Por favor contacta al soporte.');
              } else {
                console.log('Perfil creado con método final');
                toast.success('Registro exitoso! Por favor verifica tu email.');
              }
            } else {
              console.log('Perfil creado con método alternativo');
              toast.success('Registro exitoso! Por favor verifica tu email.');
            }
          } else {
            console.log('Perfil creado exitosamente:', profileData);
            toast.success('Registro exitoso! Por favor verifica tu email.');
          }
        } catch (profileCreationError: any) {
          console.error('Error al crear/actualizar perfil:', profileCreationError);
          toast.warning('Usuario creado pero hubo un problema con el perfil. Por favor contacta al soporte.');
        }
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

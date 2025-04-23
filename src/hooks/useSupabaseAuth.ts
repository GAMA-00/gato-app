
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

  // Función mejorada para crear el perfil de usuario
  const createUserProfile = async (userId: string, userData: any) => {
    console.log('Intentando crear perfil para el usuario:', userId);
    console.log('Datos de perfil:', JSON.stringify(userData));
    
    const profileObject = {
      id: userId,
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: userData.role,
      building_id: userData.buildingId || null,
      has_payment_method: false
    };
    
    console.log('Objeto de perfil a insertar:', profileObject);
    
    // MÉTODO 1: Insert directo a la tabla profiles
    console.log('MÉTODO 1: Insertando directamente en la tabla profiles');
    try {
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
              user_building_id: userData.buildingId || null
            }
          );
          
          if (rpcError) {
            console.error('ERROR MÉTODO 2:', rpcError);
            console.error('Código de error RPC:', rpcError.code);
            console.error('Mensaje de error RPC:', rpcError.message);
            console.error('Detalles RPC:', rpcError.details);
            
            // MÉTODO 3: Llamada REST directa
            console.log('MÉTODO 3: Intentando con llamada REST directa');
            try {
              const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
                'apikey': SUPABASE_PUBLISHABLE_KEY,
                'Prefer': 'return=minimal'
              };
              
              console.log('Headers de petición REST:', headers);
              console.log('URL de la petición REST:', `${SUPABASE_URL}/rest/v1/profiles`);
              
              const response = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(profileObject)
              });
              
              if (!response.ok) {
                console.error('ERROR MÉTODO 3: Respuesta no ok');
                console.error('Estado HTTP:', response.status);
                console.error('Texto de respuesta:', await response.text());
                return false;
              } else {
                console.log('MÉTODO 3: Perfil creado con éxito');
                return true;
              }
            } catch (restError: any) {
              console.error('ERROR MÉTODO 3: Excepción en fetch', restError);
              return false;
            }
          } else {
            console.log('MÉTODO 2: Perfil creado con éxito mediante RPC');
            return true;
          }
        } catch (rpcCallError: any) {
          console.error('ERROR MÉTODO 2: Excepción en llamada RPC', rpcCallError);
          return false;
        }
      } else {
        console.log('MÉTODO 1: Perfil creado con éxito mediante insert directo');
        console.log('Datos del perfil creado:', profileData);
        return true;
      }
    } catch (insertError: any) {
      console.error('ERROR MÉTODO 1: Excepción en insert', insertError);
      return false;
    }
  };

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
        console.log('UUID de usuario creado:', data.user.id);
        
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
        
        // Preparar datos para el perfil
        const profileCreateSuccess = await createUserProfile(data.user.id, {
          ...userData,
          email: email,
          buildingId: buildingIdForProfile
        });

        if (profileCreateSuccess) {
          console.log('Perfil creado exitosamente');
          toast.success('Registro exitoso! Por favor verifica tu email.');
        } else {
          console.warn('No se pudo crear el perfil pero la cuenta de usuario sí fue creada');
          toast.warning('Cuenta creada pero hubo un problema con el perfil. Por favor contacta al soporte.');
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

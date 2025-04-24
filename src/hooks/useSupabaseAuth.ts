
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
              role: profile.role as UserRole,
              avatarUrl: profile.avatar_url || ''  // Añadiendo la URL del avatar
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
                role: profile.role as UserRole,
                avatarUrl: profile.avatar_url || ''  // Añadiendo la URL del avatar
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
      console.log('Creando perfil para usuario con ID:', userId);
      console.log('Datos de usuario para perfil:', userData);
      
      // Primero, subir el avatar si existe
      let avatarUrl = null;
      if (userData.avatarFile) {
        console.log('Procesando avatar del usuario...');
        try {
          // Crear un nombre de archivo único usando el ID de usuario
          const fileExt = userData.avatarFile.name.split('.').pop();
          const filePath = `${userId}/avatar.${fileExt}`;
          
          console.log('Subiendo avatar a Storage:', filePath);
          
          // Subir la imagen
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, userData.avatarFile, {
              upsert: true
            });
          
          if (uploadError) {
            console.error('Error al subir avatar:', uploadError);
          } else {
            console.log('Avatar subido exitosamente:', uploadData);
            
            // Obtener la URL pública
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(filePath);
            
            avatarUrl = urlData.publicUrl;
            console.log('URL del avatar:', avatarUrl);
          }
        } catch (error) {
          console.error('Error en el procesamiento del avatar:', error);
        }
      }
      
      const profileData = {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        residencia_id: userData.residenciaId || null,
        has_payment_method: false,
        avatar_url: avatarUrl  // Añadir URL del avatar al perfil
      };
      
      console.log('Objeto de perfil final a insertar:', profileData);
      
      const { error } = await supabase
        .from('profiles')
        .insert([profileData]);

      if (error) {
        console.error('Error al crear perfil:', error);
        throw error;
      }
      
      console.log('Perfil creado exitosamente');
      return true;
    } catch (error: any) {
      console.error('Error en createUserProfile:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando registro con datos:', { email, ...userData });
    
    if (isLoading) {
      console.log('Ya hay una solicitud en curso, abortando');
      return { data: null, error: new Error('Ya hay una solicitud en curso') };
    }
    
    setIsLoading(true);
    
    try {
      // Validar si el correo ya fue registrado previamente
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .limit(1);
      
      if (checkError) {
        console.error('Error al verificar email existente:', checkError);
      }
      
      if (existingUsers && existingUsers.length > 0) {
        console.warn('Email ya registrado:', email);
        throw new Error('Este correo electrónico ya está registrado. Intenta iniciar sesión.');
      }
      
      console.log('Paso 1: Creando usuario en auth.users...');
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone
          }
        }
      });

      if (error) {
        console.error('Error en supabase.auth.signUp:', error);
        
        // Manejar específicamente el error de límite de tasa
        if (error.message.includes('email rate limit')) {
          console.log('Error de límite de tasa de email detectado. Intentando solución alternativa...');
          
          // Sugerir al usuario usar otro email
          throw new Error('Se ha excedido el límite de emails para este correo. Por favor, intenta con otro correo electrónico o espera unos minutos.');
        }
        
        throw error;
      }
      
      if (!data.user) {
        console.error('No se pudo crear el usuario (data.user es null)');
        throw new Error('No se pudo crear el usuario');
      }
      
      console.log('Usuario creado exitosamente:', data.user.id);

      // Paso 2: Crear perfil de usuario (con manejo de residencias simplificado)
      console.log('Paso 2: Creando perfil para el usuario...');
      
      // Determinar el ID de residencia para guardar en el perfil
      let residenciaId = null;
      if (userData.role === 'client') {
        residenciaId = userData.residenciaId;
      } else if (userData.role === 'provider' && userData.providerResidenciaIds && userData.providerResidenciaIds.length > 0) {
        // Para proveedores, guardamos la primera residencia seleccionada en su perfil
        residenciaId = userData.providerResidenciaIds[0];
      }
      
      console.log('ID de residencia seleccionada para el perfil:', residenciaId);
      
      await createUserProfile(data.user.id, {
        ...userData,
        email: email,
        residenciaId: residenciaId
      });

      console.log('Proceso de registro completado exitosamente');
      toast.success('Registro exitoso! Por favor verifica tu email para iniciar sesión.');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('Error en proceso de registro:', error);
      
      // Mensajes de error específicos
      let errorMsg = error.message;
      if (error.message.includes('email rate limit')) {
        errorMsg = 'Se ha excedido el límite de emails. Intenta con otro email o espera unos minutos.';
      } else if (error.message.includes('User already registered')) {
        errorMsg = 'Este email ya está registrado. Intenta iniciar sesión.';
      }
      
      toast.error(errorMsg || 'Error durante el registro');
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

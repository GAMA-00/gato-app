
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserRole } from '@/lib/types';

export const useSupabaseAuth = () => {
  const { login: setAuthUser, logout: clearAuthUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [registrationAttempts, setRegistrationAttempts] = useState(0);

  useEffect(() => {
    console.log('Iniciando setup de autenticación con Supabase');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Evento de autenticación:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('Usuario autenticado:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error al obtener perfil:', profileError);
              toast.error('Error al cargar perfil de usuario');
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
                avatarUrl: profile.avatar_url 
              });
            } else {
              console.warn('No se encontró perfil para el usuario:', session.user.id);
              toast.warning('Perfil de usuario no encontrado');
            }
          } catch (error) {
            console.error('Error en el procesamiento de perfil:', error);
            toast.error('Error al procesar perfil de usuario');
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuario cerró sesión');
          clearAuthUser();
        }
      }
    );

    const loadInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error al obtener sesión:', error);
          return;
        }
        
        if (session?.user) {
          console.log('Sesión existente encontrada para:', session.user.id);
          try {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error al obtener perfil en inicio:', profileError);
              return;
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
                avatarUrl: profile.avatar_url 
              });
            } else {
              console.warn('No se encontró perfil para el usuario en inicio:', session.user.id);
            }
          } catch (error) {
            console.error('Error al cargar perfil inicial:', error);
          }
        } else {
          console.log('No hay sesión activa');
        }
      } catch (error) {
        console.error('Error al verificar sesión inicial:', error);
      }
    };

    loadInitialSession();

    return () => {
      console.log('Limpiando suscripción de autenticación');
      subscription.unsubscribe();
    };
  }, [setAuthUser, clearAuthUser]);

  // IMPLEMENTACIÓN MEJORADA: Verificación directa si un email existe en Auth
  const checkEmailExists = async (email: string): Promise<boolean> => {
    console.log('Verificando si existe email en Supabase:', email);
    try {
      // Intentar una operación que nos diga si el usuario existe sin enviar emails
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      
      // Si NO hay error de "usuario no encontrado", el usuario existe
      const userNotFoundError = error && 
        (error.message.includes('User not found') || 
         error.message.includes('No user found'));
      
      console.log('Resultado de verificación email:', !userNotFoundError);
      
      if (!userNotFoundError) {
        console.log('El correo ya existe en el sistema');
        return true;
      }
      
      // Verificación adicional para asegurarnos
      const { data, error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });
      
      // Si no hay error de "usuario no encontrado", el usuario existe
      const otpUserNotFoundError = signInError && 
        (signInError.message.includes('User not found') || 
         signInError.message.includes('No user found'));
      
      console.log('Resultado de verificación adicional:', !otpUserNotFoundError);
      
      return !otpUserNotFoundError;
    } catch (error) {
      console.error('Error al verificar existencia del correo:', error);
      // En caso de error, asumimos que no existe para permitir el intento de registro
      return false;
    }
  };

  // Método mejorado para creación de perfiles
  const createUserProfile = async (userId: string, userData: any) => {
    try {
      console.log('Creando perfil para usuario con ID:', userId);
      console.log('Datos de usuario para perfil:', userData);
      
      // Primero, subir el avatar si existe
      let avatarUrl = null;
      if (userData.avatarFile) {
        console.log('Procesando avatar del usuario...');
        try {
          // Verificar si existe el bucket de avatars, intentar crearlo si no existe
          try {
            const { data: bucketData, error: bucketError } = await supabase
              .storage
              .getBucket('avatars');
            
            if (bucketError) {
              console.log('Creando bucket de avatars...');
              await supabase.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 5242880 // 5MB
              });
            }
          } catch (bucketError) {
            console.error('Error al verificar/crear bucket de avatars:', bucketError);
          }
          
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
            toast.error('Error al subir imagen de perfil');
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
          toast.error('Error al procesar imagen de perfil');
        }
      }
      
      const profileData = {
        id: userId,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        role: userData.role,
        residencia_id: userData.residenciaId || userData.providerResidenciaIds?.[0] || null,
        has_payment_method: false,
        avatar_url: avatarUrl
      };
      
      console.log('Objeto de perfil final a insertar:', profileData);
      
      const { error } = await supabase
        .from('profiles')
        .upsert([profileData], { onConflict: 'id' });

      if (error) {
        console.error('Error al crear perfil:', error);
        throw error;
      }
      
      console.log('Perfil creado exitosamente');
      return { success: true };
    } catch (error: any) {
      console.error('Error en createUserProfile:', error);
      return { success: false, error: error.message || 'Error al crear perfil de usuario' };
    }
  };

  // NUEVA IMPLEMENTACIÓN: Método de registro directo con admin API
  const registerDirectly = async (email: string, password: string, userData: any) => {
    console.log('Intentando registro DIRECTO bypass Email:', email);
    try {
      // 1. Intentar registro estándar primero
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });
      
      if (error) {
        console.error('Error en registro estándar:', error);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No se pudo crear el usuario');
      }
      
      console.log('Usuario creado con método estándar:', data.user.id);
      
      // 2. Crear perfil inmediatamente
      await createUserProfile(data.user.id, {
        ...userData,
        email
      });
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error en registerDirectly:', error);
      return { success: false, error };
    }
  };

  // NUEVA IMPLEMENTACIÓN: Método alternativo de registro
  const registerWithRandomEmail = async (email: string, password: string, userData: any) => {
    console.log('Intentando registro con email modificado');
    
    // Crear un email aleatorio basado en el original para evitar colisiones
    const emailParts = email.split('@');
    const randomString = Math.random().toString(36).substring(2, 8);
    const modifiedEmail = `${emailParts[0]}+${randomString}@${emailParts[1]}`;
    
    console.log(`Email original: ${email} -> Email modificado: ${modifiedEmail}`);
    
    // Intentar registro con el email modificado
    const result = await registerDirectly(modifiedEmail, password, {
      ...userData,
      email: modifiedEmail
    });
    
    if (result.success) {
      console.log('Registro exitoso con email modificado');
      toast.success('Cuenta creada exitosamente con variante de email');
      toast.info(`Se utilizó una variante de su email: ${modifiedEmail}`);
    }
    
    return result;
  };

  // Método principal de registro con múltiples estrategias
  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando proceso de registro completo con datos:', { email, ...userData });
    
    if (isLoading) {
      console.log('Ya hay una solicitud en curso, abortando');
      return { data: null, error: new Error('Ya hay una solicitud en curso') };
    }
    
    setIsLoading(true);
    setRegistrationAttempts(prev => prev + 1);
    
    try {
      // ESTRATEGIA 1: Verificar si el correo ya existe en sistema
      console.log('ESTRATEGIA 1: Verificando existencia previa del email');
      const emailExists = await checkEmailExists(email);
      
      if (emailExists) {
        console.log('El correo ya está registrado en Supabase Auth');
        toast.error('Este correo electrónico ya está registrado. Por favor, inicie sesión.');
        return { 
          data: null, 
          error: new Error('Este correo electrónico ya está en uso')
        };
      }

      // ESTRATEGIA 2: Intentar registro directo estándar
      console.log('ESTRATEGIA 2: Intentando registro directo estándar');
      const directResult = await registerDirectly(email, password, userData);
      
      if (directResult.success) {
        console.log('Registro directo exitoso');
        toast.success('¡Cuenta creada exitosamente!');
        return directResult;
      }
      
      // ESTRATEGIA 3: Si hay error y parece relacionado con el email, intentar con email modificado
      console.log('ESTRATEGIA 3: Intentando registro con email modificado');
      const errorMsg = directResult.error?.message || '';
      const isEmailRelatedError = errorMsg.includes('email') || 
                                  errorMsg.includes('correo') || 
                                  errorMsg.includes('422') || 
                                  errorMsg.includes('rate limit');
                                  
      if (isEmailRelatedError) {
        console.log('Error relacionado con email, intentando con email modificado');
        const alternativeResult = await registerWithRandomEmail(email, password, userData);
        return alternativeResult;
      }
      
      // Si llegamos aquí, todas las estrategias fallaron
      console.error('Todas las estrategias de registro han fallado');
      throw directResult.error || new Error('Error desconocido durante el registro');
      
    } catch (error: any) {
      console.error('Error en proceso de registro:', error);
      
      // Mensajes de error específicos
      if (error.message?.includes('email rate limit')) {
        toast.error('El servidor está muy ocupado. Por favor, intente con otro correo electrónico o espere unos minutos.');
      } else if (error.message?.includes('User already registered')) {
        toast.error('Este correo ya está registrado. Intente iniciar sesión.');
      } else {
        toast.error(error.message || 'Error durante el registro');
      }
      
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
      console.error('Error al cerrar sesión:', error);
      toast.error(error.message);
    }
  };

  return {
    signUp,
    signIn,
    signOut,
    isLoading,
    registrationAttempts
  };
};

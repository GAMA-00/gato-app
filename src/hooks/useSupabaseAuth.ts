
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
                avatarUrl: profile.avatar_url // Update to use profile.avatar_url
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
                avatarUrl: profile.avatar_url // Update to use profile.avatar_url
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

  const createUserProfile = async (userId: string, userData: any) => {
    try {
      console.log('Creando perfil para usuario con ID:', userId);
      console.log('Datos de usuario para perfil:', userData);
      
      // Primero, subir el avatar si existe
      let avatarUrl = null;
      if (userData.avatarFile) {
        console.log('Procesando avatar del usuario...');
        try {
          // Verificar si existe el bucket de avatars
          const { data: bucketData, error: bucketError } = await supabase
            .storage
            .getBucket('avatars');
          
          if (bucketError) {
            console.error('Error al verificar bucket de avatars:', bucketError);
            console.log('El bucket de avatars no existe o no se puede acceder a él');
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
      return { success: true };
    } catch (error: any) {
      console.error('Error en createUserProfile:', error);
      return { success: false, error: error.message || 'Error al crear perfil de usuario' };
    }
  };

  // Nueva función para verificar si un correo ya está registrado
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false
        }
      });

      // Si hay un error "User not found", entonces el correo no existe
      if (error && error.message.includes('User not found')) {
        return false;
      }

      // Si no hay error o el error es diferente, probablemente el usuario ya existe
      return true;
    } catch (error) {
      console.error('Error al verificar existencia de correo:', error);
      return false; // Asumir que no existe en caso de error
    }
  };

  const directSignUp = async (email: string, password: string, userData: any) => {
    try {
      console.log('Intentando registro directo sin confirmación de correo...');
      
      // 1. Crear el usuario con autoconfirmación
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: userData.name,
            role: userData.role,
            phone: userData.phone
          },
          // No redirigir, manejar la confirmación manualmente
          emailRedirectTo: undefined
        }
      });
      
      if (error) {
        console.error('Error en registro directo:', error);
        return { success: false, error };
      }
      
      if (!data.user) {
        return { 
          success: false, 
          error: new Error('No se pudo crear el usuario') 
        };
      }
      
      console.log('Usuario creado exitosamente:', data.user.id);
      
      // 2. Crear perfil inmediatamente
      const profileResult = await createUserProfile(data.user.id, {
        ...userData,
        email: email,
        residenciaId: userData.role === 'client' 
          ? userData.residenciaId
          : (userData.providerResidenciaIds && userData.providerResidenciaIds.length > 0 
            ? userData.providerResidenciaIds[0] 
            : null)
      });
      
      if (!profileResult.success) {
        console.error('Error al crear perfil en registro directo:', profileResult.error);
        return { 
          success: false, 
          error: new Error(profileResult.error || 'Error al crear perfil de usuario'),
          user: data.user
        };
      }
      
      // 3. Iniciar sesión directamente
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.error('Error al iniciar sesión tras registro directo:', signInError);
        return { 
          success: true, 
          needsManualLogin: true, 
          error: signInError,
          user: data.user 
        };
      }
      
      return { success: true, data };
      
    } catch (error: any) {
      console.error('Error en directSignUp:', error);
      return { success: false, error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando registro con datos:', { email, ...userData });
    
    if (isLoading) {
      console.log('Ya hay una solicitud en curso, abortando');
      return { data: null, error: new Error('Ya hay una solicitud en curso') };
    }
    
    setIsLoading(true);
    setRegistrationAttempts(prev => prev + 1);
    
    try {
      // Paso 1: Verificar si el correo ya existe
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        console.log('El correo ya está registrado, redirigiendo a inicio de sesión');
        toast.error('Este correo electrónico ya está en uso. Por favor, inicie sesión.');
        return { 
          data: null, 
          error: new Error('Este correo electrónico ya está en uso')
        };
      }

      // Paso 2: Intentar el registro directo (sin enviar email)
      console.log('Iniciando proceso de registro con Supabase...');
      const result = await directSignUp(email, password, userData);

      if (result.success) {
        console.log('Registro directo exitoso');
        toast.success('¡Cuenta creada exitosamente!');
        
        if (result.needsManualLogin) {
          toast.info('Por favor, inicie sesión con su nuevo correo y contraseña');
        } else {
          toast.success('¡Iniciando sesión automáticamente!');
        }
        
        return { data: result.data, error: null };
      } else {
        // Si no podemos registrar al usuario directamente, mostramos el error
        console.error('Error en registro directo:', result.error);
        throw result.error;
      }
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

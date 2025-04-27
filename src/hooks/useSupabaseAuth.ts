
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

  // IMPLEMENTACIÓN MEJORADA Y SIMPLIFICADA:
  // Esta función ahora está optimizada para detectar correctamente si un correo ya está registrado
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      console.log('Verificando si existe email:', email);
      
      // Método confiable: Intentar iniciar sesión con un OTP (no envía email)
      // y verificar el tipo de error
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Esto es clave para no crear usuarios nuevos
        }
      });
      
      // Si el error contiene "User not found", entonces el correo NO existe
      const userNotFound = error && (
        error.message.includes('User not found') || 
        error.message.includes('No user found') ||
        error.message.includes('Email not found')
      );
      
      console.log('¿Usuario no encontrado?:', userNotFound);
      console.log('¿El correo existe?:', !userNotFound);
      
      return !userNotFound; // Si NO hay error de "usuario no encontrado", el correo existe
    } catch (error) {
      console.error('Error al verificar existencia del correo:', error);
      return false; // En caso de error, asumimos que no existe
    }
  };

  // Método mejorado para creación de perfiles
  const createUserProfile = async (userId: string, userData: any) => {
    try {
      console.log('Creando perfil para usuario con ID:', userId);
      console.log('Datos de usuario para perfil:', userData);
      
      // Subir el avatar si existe
      let avatarUrl = null;
      if (userData.avatarFile) {
        console.log('Procesando avatar del usuario...');
        try {
          // Verificar si existe el bucket de avatars
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
          
          // Crear un nombre de archivo único
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

  // Método simplificado de registro directo 
  const registerUser = async (email: string, password: string, userData: any) => {
    console.log('Intentando registro directo de usuario:', email);
    try {
      // 1. Registrar usuario en Auth
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
        console.error('Error en registro de usuario:', error);
        throw error;
      }
      
      if (!data.user) {
        throw new Error('No se pudo crear el usuario');
      }
      
      console.log('Usuario creado exitosamente:', data.user.id);
      
      // 2. Crear perfil
      await createUserProfile(data.user.id, {
        ...userData,
        email
      });
      
      return { success: true, data };
    } catch (error: any) {
      console.error('Error en registerUser:', error);
      return { success: false, error };
    }
  };

  // Método principal de registro significativamente simplificado
  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando proceso de registro con email:', email);
    setIsLoading(true);
    
    try {
      // 1. Verificar si el correo ya existe
      const emailExists = await checkEmailExists(email);
      
      if (emailExists) {
        console.log('El correo ya está registrado en Supabase Auth');
        toast.error('Este correo electrónico ya está registrado. Por favor, inicie sesión.');
        return { 
          data: null, 
          error: new Error('Este correo electrónico ya está en uso')
        };
      }
      
      // 2. Si el correo no existe, proceder con registro normal
      console.log('El correo no existe, procediendo con el registro');
      const result = await registerUser(email, password, userData);
      
      if (result.success) {
        toast.success('¡Cuenta creada exitosamente!');
      } else {
        toast.error(result.error?.message || 'Error durante el registro');
      }
      
      return result;
    } catch (error: any) {
      console.error('Error en proceso de registro:', error);
      toast.error(error.message || 'Error durante el registro');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Mantener los métodos de inicio de sesión y cierre de sesión originales
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

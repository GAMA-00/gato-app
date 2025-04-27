
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
                buildingName: '', 
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
                buildingName: '', 
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

  // Check if a phone number is already registered
  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    try {
      console.log('Verificando si existe teléfono:', phone);
      
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .limit(1);
      
      const exists = !error && profiles && profiles.length > 0;
      console.log('¿El teléfono ya está registrado?:', exists);
      
      return exists;
    } catch (error) {
      console.error('Error al verificar existencia del teléfono:', error);
      return false;
    }
  };

  // Method for creating user profiles
  const createUserProfile = async (userId: string, userData: any) => {
    try {
      console.log('Creando perfil para usuario con ID:', userId);
      console.log('Datos de usuario para perfil:', userData);
      
      // Upload avatar if exists
      let avatarUrl = null;
      if (userData.avatarFile) {
        console.log('Procesando avatar del usuario...');
        try {
          // Check if avatars bucket exists
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
          
          // Create a unique filename
          const fileExt = userData.avatarFile.name.split('.').pop();
          const filePath = `${userId}/avatar.${fileExt}`;
          
          console.log('Subiendo avatar a Storage:', filePath);
          
          // Upload image
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
            
            // Get public URL
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

  // Direct registration method
  const signUp = async (email: string, password: string, userData: any) => {
    console.log('Iniciando proceso de registro con email:', email);
    setIsLoading(true);
    
    try {
      // 1. Check if phone number is already registered
      if (userData.phone) {
        const phoneExists = await checkPhoneExists(userData.phone);
        
        if (phoneExists) {
          console.log('El número de teléfono ya está registrado');
          toast.error('Este número de teléfono ya está registrado. Por favor, use otro número.');
          return { 
            data: null, 
            error: new Error('Este número de teléfono ya está en uso')
          };
        }
      }
      
      // 2. Try direct user registration with Supabase
      console.log('Intentando registrar usuario directamente:', email);
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
      
      // 3. Handle registration errors
      if (error) {
        console.error('Error en registro de usuario:', error);
        
        // If the error message contains "email already in use" or similar
        if (error.message && (
            error.message.includes('already in use') || 
            error.message.includes('already registered') ||
            error.message.includes('email already taken')
          )) {
          toast.error('Este correo electrónico ya está registrado. Por favor, inicie sesión o use otro correo.');
        } else {
          toast.error(error.message || 'Error durante el registro');
        }
        
        return { data: null, error };
      }
      
      // 4. Create user profile if registration was successful
      if (data?.user) {
        console.log('Usuario creado exitosamente:', data.user.id);
        
        await createUserProfile(data.user.id, {
          ...userData,
          email
        });
        
        toast.success('¡Cuenta creada exitosamente!');
        return { data, error: null };
      } else {
        console.error('No se recibieron datos de usuario después del registro');
        toast.error('Error al crear la cuenta');
        return { 
          data: null, 
          error: new Error('No se pudo crear el usuario')
        };
      }
    } catch (error: any) {
      console.error('Error inesperado durante el registro:', error);
      toast.error(error.message || 'Error durante el registro');
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  };

  // Login method
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

  // Logout method
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

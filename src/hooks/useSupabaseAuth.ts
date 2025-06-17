
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';

export const useSupabaseAuth = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const signIn = async (email: string, password: string) => {
    console.log('🔥 ==> useSupabaseAuth.signIn INICIADO');
    console.log('🔥 Email recibido:', email);
    console.log('🔥 Password length:', password?.length || 0);
    console.log('🔥 Supabase client URL:', SUPABASE_URL);
    console.log('🔥 Supabase client key (first 20 chars):', SUPABASE_PUBLISHABLE_KEY?.substring(0, 20));
    
    setLoading(true);
    console.log('🔥 Estado loading establecido a true');
    
    try {
      console.log('🔥 Verificando sesión actual antes de limpiar...');
      const { data: currentSession } = await supabase.auth.getSession();
      console.log('🔥 Sesión actual:', currentSession?.session ? 'EXISTE' : 'NO EXISTE');
      
      console.log('🔥 Limpiando sesión anterior...');
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.log('🔥 Error al limpiar sesión:', signOutError);
      } else {
        console.log('🔥 Sesión limpiada exitosamente');
      }
      
      console.log('🔥 Iniciando signInWithPassword...');
      console.log('🔥 Timestamp antes de signIn:', new Date().toISOString());
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('🔥 Timestamp después de signIn:', new Date().toISOString());
      console.log('🔥 Respuesta de Supabase auth:', {
        tieneData: !!data,
        tieneUser: !!data?.user,
        tieneSession: !!data?.session,
        errorMessage: error?.message,
        errorCode: error?.status,
        errorDetails: error
      });

      if (error) {
        console.error('🔥 ERROR EN SUPABASE AUTH:', {
          message: error.message,
          status: error.status,
          name: error.name,
          fullError: error
        });
        setLoading(false);
        return { data: null, error };
      }

      if (!data?.user || !data?.session) {
        console.error('🔥 ERROR: No hay user o session en la respuesta');
        console.log('🔥 Data completa recibida:', data);
        setLoading(false);
        return { data: null, error: { message: 'Error en la respuesta de autenticación' } };
      }

      console.log('🔥 Auth exitoso! Datos del usuario:', {
        userId: data.user.id,
        userEmail: data.user.email,
        sessionAccessToken: data.session.access_token ? 'PRESENTE' : 'AUSENTE',
        sessionRefreshToken: data.session.refresh_token ? 'PRESENTE' : 'AUSENTE'
      });
      
      console.log('🔥 Obteniendo perfil de usuario desde la tabla users...');
      
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      console.log('🔥 Resultado de la consulta del perfil:', {
        tieneProfile: !!profile,
        profileErrorMessage: profileError?.message,
        profileErrorCode: profileError?.code,
        profileErrorDetails: profileError,
        profileRole: profile?.role,
        profileData: profile
      });

      if (profileError || !profile) {
        console.error('🔥 ERROR obteniendo perfil de usuario:', {
          error: profileError,
          hasProfile: !!profile
        });
        setLoading(false);
        return { data: null, error: profileError || { message: 'No se encontró el perfil de usuario' } };
      }

      const userData = {
        id: profile.id,
        name: profile.name || data.user.user_metadata?.name || '',
        email: profile.email || data.user.email || '',
        phone: profile.phone || '',
        residenciaId: profile.residencia_id || '',
        buildingName: '',
        hasPaymentMethod: profile.has_payment_method || false,
        role: profile.role as 'client' | 'provider' | 'admin',
        avatarUrl: profile.avatar_url || '',
        apartment: profile.house_number || '',
        houseNumber: profile.house_number || '',
        condominiumId: profile.condominium_id || '',
        condominiumName: profile.condominium_name || '',
      };

      console.log('🔥 Objeto de usuario creado:', userData);
      console.log('🔥 Llamando a login() del AuthContext...');

      login(userData);

      console.log('🔥 AuthContext actualizado exitosamente');
      console.log('🔥 Login completado exitosamente para usuario:', userData.email, 'con rol:', userData.role);

      setLoading(false);
      console.log('🔥 Estado loading establecido a false');
      console.log('🔥 ==> useSupabaseAuth.signIn COMPLETADO EXITOSAMENTE');
      return { data, error: null };
      
    } catch (error: any) {
      console.error('🔥 EXCEPCIÓN CAPTURADA EN useSupabaseAuth.signIn:', {
        message: error.message,
        stack: error.stack,
        fullError: error
      });
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error inesperado durante el inicio de sesión' } };
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      setLoading(false);
      return { data, error };
    } catch (error: any) {
      setLoading(false);
      return { data: null, error: { message: error.message || 'Error durante el registro' } };
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        navigate('/', { replace: true });
      }
      setLoading(false);
      return { error };
    } catch (error: any) {
      setLoading(false);
      return { error: { message: error.message || 'Error durante el cierre de sesión' } };
    }
  };

  return {
    signIn,
    signUp,
    signOut,
    loading
  };
};

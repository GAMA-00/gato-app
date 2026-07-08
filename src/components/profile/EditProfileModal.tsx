import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { unifiedAvatarUpload } from '@/utils/unifiedAvatarUpload';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import UnifiedAvatar from '@/components/ui/unified-avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Key, Check } from 'lucide-react';
import { toast } from 'sonner';
import PasswordChangeModal from './PasswordChangeModal';
import { COVER_THEMES } from '@/utils/coverThemes';

const clientProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string()
    .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
    .length(12, 'El número debe tener exactamente 8 dígitos')
    .optional()
    .or(z.literal('')),
});

const providerProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string()
    .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
    .length(12, 'El número debe tener exactamente 8 dígitos')
    .optional()
    .or(z.literal('')),
  aboutMe: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientProfileSchema>;
type ProviderFormData = z.infer<typeof providerProfileSchema>;

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { profile, invalidateProfile } = useUserProfile();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [coverTheme, setCoverTheme] = useState<string>('coral');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isProvider = user?.role === 'provider';

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
    },
  });

  const providerForm = useForm<ProviderFormData>({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      aboutMe: '',
    },
  });

  const form = isProvider ? providerForm : clientForm;

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      console.log('=== Updating form with profile data ===', profile);
      
      if (isProvider) {
        providerForm.reset({
          name: profile.name || '',
          phone: profile.phone || '',
          aboutMe: profile.about_me || '',
        });
      } else {
        clientForm.reset({
          name: profile.name || '',
          phone: profile.phone || '',
        });
      }

      setAvatarPreview(profile.avatar_url || '');
      setCoverTheme((profile as any).cover_theme || 'coral');
    }
  }, [profile, isProvider]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Avatar file selected:', { 
        name: file.name, 
        type: file.type, 
        size: file.size 
      });

      // Validate file type immediately
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!file.type || !allowedTypes.includes(file.type)) {
        toast.error('El archivo debe ser una imagen válida (JPEG, PNG o WebP)');
        event.target.value = ''; // Clear the input
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        event.target.value = ''; // Clear the input
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.onerror = () => {
        toast.error('Error al leer el archivo');
        setAvatarFile(null);
        setAvatarPreview(null);
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (values: ClientFormData | ProviderFormData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('=== Starting profile update ===', values);

      // Upload avatar solo si el usuario seleccionó un archivo nuevo
      if (avatarFile) {
        try {
          toast.info('Subiendo imagen de perfil...');
          await unifiedAvatarUpload(avatarFile, user.id);
          // unifiedAvatarUpload ya actualiza users.avatar_url en la DB
          toast.success('Imagen de perfil actualizada');
        } catch (error: any) {
          toast.error(`Error al subir la foto: ${error?.message ?? 'Error desconocido'}`, {
            duration: 8000,
            description: 'Verificá tu conexión y que la imagen sea JPG/PNG/WebP menor a 5 MB',
          });
          setIsLoading(false);
          return;
        }
      }

      // Actualizar perfil via RPC SECURITY DEFINER (bypasses RLS)
      const db = supabase as any;
      const { error } = await db.rpc('update_my_profile', {
        p_name: values.name,
        p_phone: values.phone || null,
        p_about_me: isProvider && 'aboutMe' in values ? (values as any).aboutMe || null : null,
        p_cover_theme: isProvider ? coverTheme : null,
      });

      if (error) {
        console.error('Error updating profile:', error);
        throw new Error(error.message);
      }

      // Invalidate and refetch profile data
      invalidateProfile();
      
      toast.success('Perfil actualizado exitosamente');
      onClose();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Avatar + Cover preview */}
            {isProvider && (
              <div className="overflow-hidden rounded-xl border">
                {/* Mini preview of booking link hero */}
                <div className={`relative h-20 ${COVER_THEMES.find(t => t.id === coverTheme)?.gradient ?? COVER_THEMES[0].gradient}`}>
                  <div className="absolute bottom-0 left-4 translate-y-1/2">
                    <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-background">
                      {(avatarPreview || profile?.avatar_url) ? (
                        <img src={avatarPreview || profile?.avatar_url!} alt="Foto de perfil" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-lg font-bold text-primary">
                          {(profile?.name || user.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-10">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Foto de perfil</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-3.5 w-3.5" />
                    Cambiar foto
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            )}

            {/* Avatar simple para clientes */}
            {!isProvider && (
              <div className="flex items-center space-x-4">
                <UnifiedAvatar
                  src={avatarPreview || profile?.avatar_url}
                  name={profile?.name || user.name || 'Usuario'}
                  size="xl"
                />
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Cambiar Foto
                  </Button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>
            )}

            {/* Cover theme selector — solo proveedores */}
            {isProvider && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tema de portada</p>
                <div className="flex gap-2 flex-wrap">
                  {COVER_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setCoverTheme(theme.id)}
                      title={theme.label}
                      className={`relative h-10 w-16 rounded-lg ${theme.gradient} transition-all ${coverTheme === theme.id ? 'ring-2 ring-offset-2 ring-foreground' : 'opacity-70 hover:opacity-100'}`}
                    >
                      {coverTheme === theme.id && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {COVER_THEMES.find(t => t.id === coverTheme)?.label}
                </p>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                <FormLabel>Teléfono</FormLabel>
                <FormControl>
                  <PhoneInput
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="12345678"
                  />
                </FormControl>
                <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            {/* Provider-specific fields */}
            {isProvider && (
              <FormField
                control={providerForm.control}
                name="aboutMe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Acerca de mí</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Cuéntanos sobre tu experiencia y servicios..."
                        className="min-h-[100px]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Password Change Section */}
            <div className="border-t pt-4">
              <FormLabel>Seguridad de la Cuenta</FormLabel>
              <Card className="mt-2">
                <CardContent className="pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="w-full"
                  >
                    <Key className="mr-2 h-4 w-4" />
                    Cambiar Contraseña
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>

      <PasswordChangeModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </Dialog>
  );
};

export default EditProfileModal;

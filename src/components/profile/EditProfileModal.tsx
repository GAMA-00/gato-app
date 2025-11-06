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
import { Upload, Key } from 'lucide-react';
import { toast } from 'sonner';
import PasswordChangeModal from './PasswordChangeModal';
import ClientResidenceField from '@/components/auth/ClientResidenceField';
import { useResidencias } from '@/hooks/useResidencias';

const clientProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string()
    .regex(/^\+506\d{8}$/, 'Debe ser un número costarricense válido (+506 + 8 dígitos)')
    .length(12, 'El número debe tener exactamente 8 dígitos')
    .optional()
    .or(z.literal('')),
  residenciaId: z.string().optional(),
  condominiumId: z.string().optional(),
  houseNumber: z.string().optional(),
  condominiumText: z.string().optional(),
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
  const { residencias, isLoading: loadingResidencias } = useResidencias();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const isProvider = user?.role === 'provider';

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      residenciaId: '',
      condominiumId: '',
      houseNumber: '',
      condominiumText: '',
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
          residenciaId: profile.residencia_id || '',
          condominiumId: profile.condominium_id || '',
          houseNumber: profile.house_number || '',
          condominiumText: profile.condominium_text || profile.condominium_name || '',
        });
      }

      setAvatarPreview(profile.avatar_url || '');
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

      let avatarUrl = profile?.avatar_url || '';
      
      // Upload new avatar if changed
      if (avatarFile) {
        console.log('Uploading new avatar with unified system...');
        try {
          toast.info('📸 Subiendo imagen de perfil...');
          
          // Usar el sistema unificado como la galería
          avatarUrl = await unifiedAvatarUpload(avatarFile, user.id);
          console.log('✅ Avatar subido exitosamente:', avatarUrl);
          
          toast.success('✅ Imagen de perfil actualizada');
          
          // Invalidar cache de React Query en lugar de reload
          invalidateProfile();
          
        } catch (error: any) {
          console.error('Avatar upload failed:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          
          let errorMessage = 'Error desconocido al subir la imagen';
          if (error?.message) {
            errorMessage = error.message;
          } else if (typeof error === 'string') {
            errorMessage = error;
          }
          
          toast.error(`Error al subir la imagen de perfil: ${errorMessage}`, { 
            duration: 8000,
            description: 'Verifica tu conexión y que la imagen sea válida (JPG, PNG, WebP, máx 5MB)'
          });
          
          // No continuar si falla el avatar, ya que es lo principal que se está editando
          setIsLoading(false);
          return;
        }
      }

      // Prepare update data
      const updateData: any = {
        name: values.name,
        phone: values.phone || '',
        avatar_url: avatarUrl,
      };

      // Add provider-specific fields
      if (isProvider && 'aboutMe' in values) {
        updateData.about_me = values.aboutMe || '';
      }
      
      // Only clients have location data
      if (!isProvider && 'residenciaId' in values) {
        let resolvedCondominiumName = values.condominiumText || '';
        
        if (values.condominiumId && !resolvedCondominiumName) {
          console.log('Resolving condominium name for ID:', values.condominiumId);
          
          if (values.condominiumId.startsWith('static-')) {
            // Static condominium from predefined list
            const condominiumNames = [
              'El Carao', 'La Ceiba', 'Guayaquil', 'Ilang-Ilang', 'Nogal', 
              'Guayacán Real', 'Cedro Alto', 'Roble Sabana', 'Alamo', 'Guaitil'
            ];
            const index = parseInt(values.condominiumId.replace('static-', ''));
            if (index >= 0 && index < condominiumNames.length) {
              resolvedCondominiumName = condominiumNames[index];
            }
          } else {
            // Database condominium - fetch name
            try {
              const { data: condominiumData, error } = await supabase
                .from('condominiums')
                .select('name')
                .eq('id', values.condominiumId)
                .single();
                
              if (!error && condominiumData) {
                resolvedCondominiumName = condominiumData.name;
              }
            } catch (error) {
              console.error('Failed to resolve condominium name:', error);
            }
          }
        }

        updateData.residencia_id = values.residenciaId || null;
        updateData.condominium_id = values.condominiumId || null;
        updateData.house_number = values.houseNumber || '';
        updateData.condominium_text = resolvedCondominiumName;
        updateData.condominium_name = resolvedCondominiumName;
      }

      console.log('=== Updating user data ===', updateData);

      // Update user profile
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

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
            {/* Avatar Section */}
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

            {/* Location Info - SOLO PARA CLIENTES */}
            {!isProvider && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Información de Ubicación</h3>
                <ClientResidenceField
                  residencias={residencias}
                  isSubmitting={isLoading}
                  loadingResidencias={loadingResidencias}
                  form={form}
                />
              </div>
            )}

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

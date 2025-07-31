import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { uploadAvatar as uploadAvatarNew } from '@/utils/avatarUpload';
import { uploadCertificationFiles, uploadGalleryImages } from '@/utils/uploadService';
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
import { Button } from '@/components/ui/button';
import ProviderAvatar from '@/components/ui/provider-avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Plus, FileText, Image, Key } from 'lucide-react';
import { toast } from 'sonner';
import PasswordChangeModal from './PasswordChangeModal';

const clientProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  houseNumber: z.string().optional(),
  condominiumText: z.string().optional(),
});

const providerProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  houseNumber: z.string().optional(),
  condominiumText: z.string().optional(),
  aboutMe: z.string().optional(),
  experienceYears: z.number().min(0).max(50).optional(),
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
  const [certificationFiles, setCertificationFiles] = useState<File[]>([]);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingCertifications, setExistingCertifications] = useState<string[]>([]);
  const [existingGalleryImages, setExistingGalleryImages] = useState<string[]>([]);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const certificationInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isProvider = user?.role === 'provider';

  const clientForm = useForm<ClientFormData>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      houseNumber: '',
      condominiumText: '',
    },
  });

  const providerForm = useForm<ProviderFormData>({
    resolver: zodResolver(providerProfileSchema),
    defaultValues: {
      name: '',
      phone: '',
      houseNumber: '',
      condominiumText: '',
      aboutMe: '',
      experienceYears: 0,
    },
  });

  const form = isProvider ? providerForm : clientForm;

  // Update form when profile data is loaded
  useEffect(() => {
    if (profile) {
      console.log('=== Updating form with profile data ===', profile);
      
      const commonData = {
        name: profile.name || '',
        phone: profile.phone || '',
        houseNumber: profile.house_number || '',
        condominiumText: profile.condominium_text || profile.condominium_name || '',
      };

      clientForm.reset(commonData);
      
      if (isProvider) {
        providerForm.reset({
          ...commonData,
          aboutMe: profile.about_me || '',
          experienceYears: profile.experience_years || 0,
        });
      }

      // Load existing files
      if (profile.certification_files && Array.isArray(profile.certification_files)) {
        const certUrls = profile.certification_files.map((cert: any) => cert.url || cert).filter(Boolean);
        setExistingCertifications(certUrls);
      }

      setAvatarPreview(profile.avatar_url || '');
    }
  }, [profile, isProvider]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCertificationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setCertificationFiles(prev => [...prev, ...files]);
  };

  const handleGalleryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setGalleryImages(prev => [...prev, ...files]);
  };

  const removeCertification = (index: number) => {
    setCertificationFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingCertification = (index: number) => {
    setExistingCertifications(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: ClientFormData | ProviderFormData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('=== Starting profile update ===', values);

      let avatarUrl = profile?.avatar_url || '';
      
      // Upload new avatar if changed
      if (avatarFile) {
        console.log('Uploading new avatar...');
        try {
          avatarUrl = await uploadAvatarNew(avatarFile, user.id);
          console.log('Avatar uploaded successfully:', avatarUrl);
        } catch (error) {
          console.warn('Avatar upload failed:', error);
          toast.error('Error al subir la imagen de perfil');
        }
      }

      // Upload new certification files
      let allCertificationUrls = [...existingCertifications];
      if (certificationFiles.length > 0) {
        console.log('Uploading certification files...');
        const newCertUrls = await uploadCertificationFiles(certificationFiles, user.id);
        allCertificationUrls = [...allCertificationUrls, ...newCertUrls];
      }

      // Upload new gallery images
      let allGalleryUrls = [...existingGalleryImages];
      if (galleryImages.length > 0) {
        console.log('Uploading gallery images...');
        const newGalleryUrls = await uploadGalleryImages(galleryImages, user.id);
        allGalleryUrls = [...allGalleryUrls, ...newGalleryUrls];
      }

      // Prepare update data
      const updateData: any = {
        name: values.name,
        phone: values.phone || '',
        house_number: values.houseNumber || '',
        condominium_text: values.condominiumText || '',
        condominium_name: values.condominiumText || '',
        avatar_url: avatarUrl,
      };

      // Add provider-specific fields
      if (isProvider && 'aboutMe' in values) {
        updateData.about_me = values.aboutMe || '';
        updateData.experience_years = values.experienceYears || 0;
        
        // Save certification files as JSON
        if (allCertificationUrls.length > 0) {
          updateData.certification_files = JSON.stringify(
            allCertificationUrls.map(url => ({ url, name: 'Certificación', type: 'file' }))
          );
        }
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
              <ProviderAvatar
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condominiumText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condominio</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="houseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Casa</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Provider-specific fields */}
            {isProvider && (
              <>
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

                <FormField
                  control={providerForm.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Años de Experiencia</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          max="50"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Existing Certifications */}
                <div>
                  <FormLabel>Certificaciones Actuales</FormLabel>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      {existingCertifications.length > 0 && (
                        <div className="mb-4 space-y-2">
                          {existingCertifications.map((url, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">Certificación {index + 1}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeExistingCertification(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => certificationInputRef.current?.click()}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Nuevas Certificaciones
                      </Button>
                      <input
                        ref={certificationInputRef}
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleCertificationChange}
                      />
                      
                      {certificationFiles.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {certificationFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-sm text-blue-700">Nuevo: {file.name}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeCertification(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Gallery */}
                <div>
                  <FormLabel>Galería de Trabajos</FormLabel>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => galleryInputRef.current?.click()}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Imágenes
                      </Button>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleGalleryChange}
                      />
                      
                      {galleryImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          {galleryImages.map((image, index) => (
                            <div key={index} className="relative">
                              <img 
                                src={URL.createObjectURL(image)} 
                                alt={`Nueva imagen ${index + 1}`} 
                                className="w-full h-20 object-cover rounded"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-6 w-6 p-0 bg-red-500 text-white hover:bg-red-600"
                                onClick={() => removeGalleryImage(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
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


import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile, updateUserAvatar } from '@/utils/profileManagement';
import { uploadCertificationFiles, uploadGalleryImages } from '@/utils/fileUploadUtils';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, X, Plus } from 'lucide-react';
import { toast } from 'sonner';

const clientProfileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  phone: z.string().optional(),
  houseNumber: z.string().optional(),
  condominiumText: z.string().optional(),
});

const providerProfileSchema = clientProfileSchema.extend({
  aboutMe: z.string().optional(),
  experienceYears: z.number().min(0).max(50).optional(),
});

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [certificationFiles, setCertificationFiles] = useState<any[]>([]);
  const [galleryImages, setGalleryImages] = useState<(File | string)[]>([]);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const certificationInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const isProvider = user?.role === 'provider';
  const schema = isProvider ? providerProfileSchema : clientProfileSchema;

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
      houseNumber: user?.houseNumber || '',
      condominiumText: user?.condominiumName || '',
      ...(isProvider && {
        aboutMe: '',
        experienceYears: 0,
      }),
    },
  });

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
    const newFiles = files.map(file => ({
      file,
      name: file.name,
      type: file.type,
      size: file.size
    }));
    setCertificationFiles(prev => [...prev, ...newFiles]);
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

  const onSubmit = async (values: z.infer<typeof schema>) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      console.log('Updating profile with values:', values);

      // Prepare update data
      const updateData: any = {
        name: values.name,
        phone: values.phone || '',
        house_number: values.houseNumber || '',
        condominium_text: values.condominiumText || '',
        condominium_name: values.condominiumText || '',
      };

      // Add provider-specific fields
      if (isProvider && 'aboutMe' in values) {
        updateData.about_me = values.aboutMe || '';
        updateData.experience_years = values.experienceYears || 0;
      }

      // Update basic profile info
      const profileResult = await updateUserProfile(user.id, updateData);
      if (!profileResult.success) {
        throw new Error(profileResult.error);
      }

      // Update avatar if changed
      if (avatarFile) {
        console.log('Uploading avatar...');
        const formData = new FormData();
        formData.append('file', avatarFile);

        // Simple avatar upload - we'll store it in a basic way
        const avatarResult = await updateUserAvatar(user.id, URL.createObjectURL(avatarFile));
        if (!avatarResult.success) {
          console.warn('Avatar upload failed:', avatarResult.error);
        }
      }

      // Handle provider-specific uploads
      if (isProvider) {
        // Upload certification files
        if (certificationFiles.length > 0) {
          console.log('Uploading certification files...');
          const certUrls = await uploadCertificationFiles(certificationFiles, user.id, true);
          console.log('Certification URLs:', certUrls);
        }

        // Upload gallery images
        if (galleryImages.length > 0) {
          console.log('Uploading gallery images...');
          const galleryUrls = await uploadGalleryImages(galleryImages, user.id);
          console.log('Gallery URLs:', galleryUrls);
        }
      }

      toast.success('Perfil actualizado exitosamente');
      onClose();
      
      // Refresh the page to show updated data
      window.location.reload();
      
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
              <Avatar className="h-20 w-20">
                <AvatarImage 
                  src={avatarPreview || user.avatarUrl} 
                  alt={user.name} 
                />
                <AvatarFallback className="text-2xl">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
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
                  control={form.control}
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
                  control={form.control}
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

                {/* Certifications */}
                <div>
                  <FormLabel>Certificaciones</FormLabel>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => certificationInputRef.current?.click()}
                        className="w-full"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar Certificaciones
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
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{file.name}</span>
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
                                src={image instanceof File ? URL.createObjectURL(image) : image} 
                                alt={`Gallery ${index}`} 
                                className="w-full h-20 object-cover rounded"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-6 w-6 p-0"
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
    </Dialog>
  );
};

export default EditProfileModal;

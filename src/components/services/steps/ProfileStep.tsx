
import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import CertificationUploader from './CertificationUploader';

const ProfileStep: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const aboutMe = watch('aboutMe') || '';
  const hasCertifications = watch('hasCertifications');
  const certificationFiles = watch('certificationFiles') || [];
  const profileImage = watch('profileImage');
  const galleryImages = watch('galleryImages') || [];
  
  // Separate ref for profile image preview to avoid unnecessary updates
  const [profileImagePreview, setProfileImagePreview] = React.useState<string | null>(null);
  
  // Update preview only when profile image actually changes
  React.useEffect(() => {
    // Check if profileImage is a valid File object
    if (profileImage && 
        profileImage instanceof File && 
        typeof profileImage === 'object' &&
        profileImage.constructor === File) {
      const newPreview = URL.createObjectURL(profileImage as File);
      setProfileImagePreview(newPreview);
      
      return () => {
        URL.revokeObjectURL(newPreview);
      };
    } else {
      setProfileImagePreview(null);
    }
  }, [profileImage]);
  
  // Safely create URL for files
  const safeCreateObjectURL = (file: unknown): string | null => {
    // Check if file is a Blob (which includes File objects)
    if (file && typeof Blob !== 'undefined' && file instanceof Blob) {
      return URL.createObjectURL(file);
    }
    
    // If it's a string, it might already be a URL
    if (typeof file === 'string') {
      return file;
    }
    
    // If it has a url property (for already uploaded files)
    if (file && typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
      return file.url;
    }
    
    return null;
  };

  // Clean up object URLs when component unmounts
  React.useEffect(() => {
    return () => {
      // Clean up profile image preview
      if (profileImagePreview && profileImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(profileImagePreview);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">2. Perfil Profesional</h2>
      
      <div className="bg-muted/40 rounded-lg border p-4">
      
        <FormField
          control={control}
          name="profileImage"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Foto de perfil</FormLabel>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {profileImagePreview ? (
                    <AvatarImage 
                      src={profileImagePreview}
                      alt="Profile preview" 
                    />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {field.value?.name?.charAt(0) || '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <FormControl>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Subir imagen</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </FormControl>
              </div>
               <FormDescription>
                 La primera impresión es importante. Recomendado: Foto tipo pasaporte
               </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="aboutMe"
          render={({ field }) => (
            <FormItem className="mb-4">
              <FormLabel>Sobre mí</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cuéntale a tus clientes sobre tu experiencia, formación y filosofía de trabajo..."
                  rows={4}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="space-y-4 pt-2">
          <FormField
            control={control}
            name="experienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Años de experiencia</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="50" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="hasCertifications"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="hasCertifications"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                  <label
                    htmlFor="hasCertifications"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Tengo certificaciones profesionales
                  </label>
                </div>
                
                {field.value && (
                  <div className="ml-6 space-y-3 border-l-2 pl-4 border-muted">
                    <FormLabel className="text-sm">Adjunta tus certificaciones</FormLabel>
                    <CertificationUploader
                      certificationFiles={certificationFiles}
                      onFilesChange={(files) => setValue('certificationFiles', files)}
                    />
                  </div>
                )}
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={control}
        name="galleryImages"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Imágenes para tu galería</FormLabel>
            <FormControl>
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2 p-2 bg-muted rounded-md hover:bg-muted/80 transition-colors">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Agregar imágenes</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      field.onChange([...(field.value || []), ...files]);
                    }}
                  />
                </label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {field.value && Array.isArray(field.value) && field.value.map((file: any, i: number) => {
                    const fileUrl = safeCreateObjectURL(file);
                    return fileUrl ? (
                      <div key={i} className="relative">
                        <img 
                          src={fileUrl} 
                          alt={`Gallery image ${i}`}
                          className="h-16 w-16 object-cover rounded" 
                        />
                        <button
                          type="button"
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                          onClick={() => {
                            const newFiles = [...field.value];
                            // Revoke the URL to prevent memory leaks
                            if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('blob:')) {
                              URL.revokeObjectURL(fileUrl);
                            }
                            newFiles.splice(i, 1);
                            field.onChange(newFiles);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </FormControl>
            <FormDescription>
              Subí fotos de trabajos pasados
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default ProfileStep;

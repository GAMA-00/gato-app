
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
import { Upload, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import CertificationUploader from './CertificationUploader';

const ProfileStep: React.FC = () => {
  const { control, setValue, watch } = useFormContext();
  const aboutMe = watch('aboutMe') || '';
  const hasCertifications = watch('hasCertifications');
  const certificationFiles = watch('certificationFiles') || [];
  const galleryImages = watch('galleryImages') || [];
  const profileImage = watch('profileImage');
  const [profileImagePreview, setProfileImagePreview] = React.useState<string | null>(null);
  
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


  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">
          2. Perfil Profesional
        </h2>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Comparte tu experiencia y certificaciones para generar confianza en los clientes.
        </p>
      </div>
      
      <div className="bg-stone-50/50 rounded-lg border border-stone-200 p-6 sm:p-8">
        {/* Avatar Section */}
        <FormField
          control={control}
          name="profileImage"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                Foto de perfil
              </FormLabel>
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  {profileImagePreview ? (
                    <AvatarImage 
                      src={profileImagePreview}
                      alt="Profile preview" 
                    />
                  ) : (
                    <AvatarFallback className="text-xl">
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <FormControl>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-white rounded-md hover:bg-stone-50 transition-colors border border-stone-300">
                      <Upload className="h-4 w-4 text-stone-600" />
                      <span className="text-sm font-medium text-stone-700">Subir imagen</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            field.onChange(file);
                            const previewUrl = URL.createObjectURL(file);
                            setProfileImagePreview(previewUrl);
                          }
                        }}
                      />
                    </label>
                  </div>
                </FormControl>
              </div>
              <FormDescription className="text-sm sm:text-base text-stone-600 mt-2">
                Una foto profesional ayuda a generar confianza con tus clientes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      

        <FormField
          control={control}
          name="aboutMe"
          render={({ field }) => (
            <FormItem className="mb-8">
              <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                Sobre mí
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Contále a tus clientes sobre tu experiencia, formación y filosofía de trabajo..."
                  rows={5}
                  value={field.value || ''}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                  }}
                  className="text-base sm:text-lg min-h-[120px] border-stone-300 focus:border-primary"
                />
              </FormControl>
              <FormDescription className="text-sm sm:text-base text-stone-600 mt-2">
                Una descripción personal ayuda a establecer confianza con tus clientes.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         <div className="space-y-8 pt-4">
          <FormField
            control={control}
            name="experienceYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base sm:text-lg font-medium text-stone-900">
                  Años de experiencia
                </FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min="0" 
                    max="50" 
                    {...field} 
                    className="text-base sm:text-lg py-4 h-auto border-stone-300 focus:border-primary"
                  />
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

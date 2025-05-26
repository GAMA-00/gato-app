
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const uploadCertificationFiles = async (
  certificationFiles: any[],
  userId: string,
  hasCertifications: boolean
) => {
  let certificationFilesUrls = [];
  
  if (hasCertifications && certificationFiles?.length) {
    try {
      for (const fileObj of certificationFiles) {
        const file = fileObj.file;
        if (!file) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('certifications')
          .upload(fileName, file);
          
        if (uploadError) throw uploadError;
        
        const { data: publicUrlData } = supabase.storage
          .from('certifications')
          .getPublicUrl(fileName);
          
        certificationFilesUrls.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: publicUrlData.publicUrl
        });
      }
    } catch (error) {
      console.error('Error uploading certification files:', error);
      toast.error('Error al subir certificados');
    }
  }
  
  return certificationFilesUrls;
};

export const uploadGalleryImages = async (
  galleryImages: (File | string)[],
  userId: string
) => {
  let galleryImageUrls: string[] = [];
  
  if (galleryImages?.length) {
    try {
      for (const item of galleryImages) {
        if (item instanceof File) {
          const fileExt = item.name.split('.').pop();
          const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('service-gallery')
            .upload(fileName, item);
            
          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabase.storage
            .from('service-gallery')
            .getPublicUrl(fileName);
            
          galleryImageUrls.push(publicUrlData.publicUrl);
        } else if (typeof item === 'string') {
          galleryImageUrls.push(item);
        }
      }
    } catch (error) {
      console.error('Error uploading gallery images:', error);
      toast.error('Error al subir imágenes de galería');
    }
  }
  
  return galleryImageUrls;
};

export const updateProviderData = async (
  userId: string,
  aboutMe?: string,
  experienceYears?: number,
  certificationFilesUrls?: any[]
) => {
  const { error: updateProviderError } = await supabase
    .from('users')
    .update({
      about_me: aboutMe || '',
      experience_years: experienceYears || 0,
      certification_files: certificationFilesUrls?.length ? JSON.stringify(certificationFilesUrls) : null,
    })
    .eq('id', userId);
    
  if (updateProviderError) {
    console.error('Error updating provider info:', updateProviderError);
  }
};

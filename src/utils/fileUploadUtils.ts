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
        
        console.log('=== UPLOADING CERTIFICATION FILE ===');
        console.log('File name:', file.name);
        console.log('File type:', file.type);
        console.log('File size:', file.size);
        
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
        
        // Convert file to ArrayBuffer to ensure proper handling
        const fileBuffer = await file.arrayBuffer();
        
        console.log('Uploading to path:', fileName);
        console.log('Content-Type will be set to:', file.type);
        
        const { error: uploadError } = await supabase.storage
          .from('certifications')
          .upload(fileName, fileBuffer, {
            cacheControl: '3600',
            upsert: true,
            contentType: file.type // Explicitly set the content type
          });
          
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        
        const { data: publicUrlData } = supabase.storage
          .from('certifications')
          .getPublicUrl(fileName);
          
        console.log('File uploaded successfully. Public URL:', publicUrlData.publicUrl);
          
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
          console.log('=== UPLOADING GALLERY IMAGE ===');
          console.log('File name:', item.name);
          console.log('File type:', item.type);
          console.log('File size:', item.size);
          
          // Validate that it's actually an image
          if (!item.type.startsWith('image/')) {
            console.warn('Skipping non-image file:', item.name, 'Type:', item.type);
            continue;
          }
          
          const fileExt = item.name.split('.').pop()?.toLowerCase();
          const fileName = `${userId}/${crypto.randomUUID()}.${fileExt}`;
          
          // Convert file to ArrayBuffer to ensure proper handling
          const fileBuffer = await item.arrayBuffer();
          
          console.log('Uploading image to path:', fileName);
          console.log('Content-Type will be set to:', item.type);
          
          const { error: uploadError } = await supabase.storage
            .from('service-gallery')
            .upload(fileName, fileBuffer, {
              cacheControl: '3600',
              upsert: true,
              contentType: item.type // Explicitly set the content type for images
            });
            
          if (uploadError) {
            console.error('Gallery image upload error:', uploadError);
            throw uploadError;
          }
          
          const { data: publicUrlData } = supabase.storage
            .from('service-gallery')
            .getPublicUrl(fileName);
            
          console.log('Gallery image uploaded successfully. Public URL:', publicUrlData.publicUrl);
            
          galleryImageUrls.push(publicUrlData.publicUrl);
        } else if (typeof item === 'string') {
          console.log('Adding existing image URL:', item);
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

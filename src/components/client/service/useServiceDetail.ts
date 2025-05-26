
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ServiceDetailData, CertificationFile } from './types';
import { ProviderData } from '@/components/client/results/types';
import { useEffect } from 'react';

export const useServiceDetail = (providerId?: string, serviceId?: string, userId?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['service-detail', serviceId, providerId],
    queryFn: async () => {
      if (!serviceId || !providerId) {
        console.error("Missing serviceId or providerId:", { serviceId, providerId });
        return null;
      }
      
      console.log("=== STARTING SERVICE DETAIL FETCH ===");
      console.log("Fetching listing details for:", { serviceId, providerId });
      
      // Get current auth status
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current auth session:", session ? "User authenticated" : "No auth session");
      
      // Get listing details including gallery_images
      const { data: listing, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(
              name,
              label
            )
          )
        `)
        .eq('id', serviceId)
        .eq('provider_id', providerId)
        .single();
        
      if (error) {
        console.error("Error fetching service details:", error);
        toast.error("Error al obtener detalles del servicio");
        throw error;
      }
      
      console.log("✅ Listing data fetched successfully:", listing);
      console.log("🖼️ Listing gallery_images raw:", listing.gallery_images);
      console.log("📋 Listing service_variants raw:", listing.service_variants);
      
      // Debug: First check if provider exists in users table without role filter
      console.log("=== CHECKING PROVIDER EXISTENCE ===");
      const { data: allProviderData, error: allProviderError } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('id', providerId);
        
      console.log("All provider data (no role filter):", allProviderData);
      if (allProviderError) {
        console.error("Error checking provider existence:", allProviderError);
      }
      
      // Get provider data from users table with role filter
      console.log("=== FETCHING PROVIDER WITH ROLE FILTER ===");
      const { data: providerQueryData, error: providerError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          about_me,
          experience_years,
          average_rating,
          certification_files,
          email,
          phone,
          avatar_url,
          role
        `)
        .eq('id', providerId)
        .eq('role', 'provider')
        .maybeSingle();
        
      if (providerError) {
        console.error("Error fetching provider details:", providerError);
        console.error("Provider error details:", {
          code: providerError.code,
          message: providerError.message,
          details: providerError.details,
          hint: providerError.hint
        });
      }
      
      console.log("Provider data from DB (with role filter):", providerQueryData);
      console.log("🗂️ Provider certification_files raw:", providerQueryData?.certification_files);
      
      // If no provider found with role=provider, try without role filter
      let providerData = providerQueryData;
      if (!providerData) {
        console.log("⚠️ Provider not found with role=provider, trying without role filter...");
        const { data: fallbackProviderData, error: fallbackError } = await supabase
          .from('users')
          .select(`
            id, 
            name, 
            about_me,
            experience_years,
            average_rating,
            certification_files,
            email,
            phone,
            avatar_url,
            role
          `)
          .eq('id', providerId)
          .maybeSingle();
          
        if (fallbackError) {
          console.error("Error fetching fallback provider:", fallbackError);
          console.error("Fallback error details:", {
            code: fallbackError.code,
            message: fallbackError.message,
            details: fallbackError.details,
            hint: fallbackError.hint
          });
        }
        
        console.log("Fallback provider data:", fallbackProviderData);
        providerData = fallbackProviderData;
      }
      
      // If still no provider found, return null to show error
      if (!providerData) {
        console.error("❌ Provider not found in database after all attempts");
        console.error("ProviderId attempted:", providerId);
        return null;
      }
      
      console.log("✅ Final provider data to use:", {
        id: providerData.id,
        name: providerData.name,
        role: providerData.role,
        avatar_url: providerData.avatar_url
      });
      
      // Get client residence info if userId provided
      let clientResidencia = null;
      if (userId) {
        console.log("=== FETCHING CLIENT RESIDENCE ===");
        const { data: clientData } = await supabase
          .from('users')
          .select('residencia_id, residencias(name, address)')
          .eq('id', userId)
          .eq('role', 'client')
          .maybeSingle();
          
        console.log("Client residence data:", clientData);
        clientResidencia = clientData?.residencias;
      }
      
      // Process provider data to include hasCertifications and parsed certification files
      let certificationFiles: CertificationFile[] = [];
      let galleryImages: string[] = [];
      
      console.log("=== PROCESSING IMAGES AND CERTIFICATIONS ===");
      
      // Parse certification files if available
      if (providerData.certification_files) {
        console.log("🗂️ Processing certification files...");
        try {
          const filesData = typeof providerData.certification_files === 'string' 
            ? JSON.parse(providerData.certification_files) 
            : providerData.certification_files;
          
          console.log("Parsed certification files data:", filesData);
          
          if (Array.isArray(filesData)) {
            certificationFiles = filesData.map((file: any) => ({
              name: file.name || file.fileName || 'Documento',
              url: file.url || file.downloadUrl || '',
              type: file.type || file.contentType || 'application/pdf',
              size: file.size || 0
            }));
            
            console.log("Processed certification files:", certificationFiles);
            
            // Extract image files from certification_files for gallery
            const imageFilesFromCerts = filesData
              .filter((file: any) => {
                const fileType = file.type || file.contentType || '';
                const isImage = fileType.startsWith('image/');
                console.log("Checking if file is image:", {
                  file: file.name || 'unnamed',
                  fileType,
                  isImage
                });
                return isImage;
              })
              .map((file: any) => file.url || file.downloadUrl || '')
              .filter(Boolean);
            
            console.log("Images extracted from certification files:", imageFilesFromCerts);
            galleryImages = [...galleryImages, ...imageFilesFromCerts];
          }
        } catch (error) {
          console.error("❌ Error parsing certification files:", error);
        }
      }
      
      // Get gallery images from the listing's gallery_images column (PRIORITY)
      if (listing.gallery_images) {
        console.log("🖼️ Processing listing gallery images...");
        try {
          const listingGalleryImages = typeof listing.gallery_images === 'string'
            ? JSON.parse(listing.gallery_images)
            : listing.gallery_images;
            
          console.log("Parsed listing gallery images:", listingGalleryImages);
            
          if (Array.isArray(listingGalleryImages)) {
            const validListingImages = listingGalleryImages.filter(Boolean);
            console.log("Valid listing gallery images:", validListingImages);
            galleryImages = [...validListingImages, ...galleryImages];
          }
        } catch (error) {
          console.error("❌ Error parsing gallery images from listing:", error);
        }
      }
      
      // Try to get images from the listing's service_variants gallery_images (FALLBACK)
      if (listing.service_variants) {
        console.log("📋 Processing service variants for gallery images...");
        try {
          const serviceVariants = typeof listing.service_variants === 'string' 
            ? JSON.parse(listing.service_variants) 
            : listing.service_variants;
          
          console.log("Parsed service variants:", serviceVariants);
          
          if (serviceVariants && typeof serviceVariants === 'object' && 'gallery_images' in serviceVariants) {
            const imagesData = typeof serviceVariants.gallery_images === 'string'
              ? JSON.parse(serviceVariants.gallery_images)
              : serviceVariants.gallery_images;
              
            console.log("Gallery images from service variants:", imagesData);
              
            if (Array.isArray(imagesData)) {
              const listingImages = imagesData.map((image: any) => 
                typeof image === 'string' ? image : (image.url || image.downloadUrl || '')
              ).filter(Boolean);
              
              console.log("Valid images from service variants:", listingImages);
              galleryImages = [...galleryImages, ...listingImages];
            }
          }
        } catch (error) {
          console.error("❌ Error parsing gallery images from service variants:", error);
        }
      }
      
      console.log("🖼️ FINAL GALLERY IMAGES ANALYSIS:");
      console.log("Total gallery images found:", galleryImages.length);
      console.log("Gallery images array:", galleryImages);
      console.log("Gallery images details:", galleryImages.map((img, index) => ({
        index,
        url: img,
        type: typeof img,
        length: img?.length,
        isValid: !!img && typeof img === 'string' && img.trim() !== '',
        domain: img ? new URL(img).hostname : 'invalid'
      })));
      
      console.log("Provider avatar URL:", providerData.avatar_url);
      console.log("Provider name:", providerData.name);
      
      const hasCertifications = certificationFiles.length > 0;
      
      // Parse service variants from JSON string if needed
      let serviceVariants = [];
      if (listing.service_variants) {
        try {
          const variantsData = typeof listing.service_variants === 'string' 
            ? JSON.parse(listing.service_variants) 
            : listing.service_variants;
            
          if (Array.isArray(variantsData) && variantsData.length > 0) {
            serviceVariants = variantsData.map((variant: any, index: number) => ({
              id: variant.id || `variant-${index}`,
              name: variant.name || `Opción ${index + 1}`,
              price: parseFloat(variant.price) || listing.base_price,
              duration: parseInt(variant.duration) || listing.duration
            }));
          }
        } catch (error) {
          console.error("Error parsing service variants:", error);
        }
      }
      
      if (serviceVariants.length === 0) {
        serviceVariants = [{
          id: 'default-variant',
          name: listing.title,
          price: listing.base_price,
          duration: listing.duration
        }];
      }
      
      // Mock data for recurring clients and services completed
      const recurringClients = Math.floor(Math.random() * 10);
      const servicesCompleted = Math.floor(Math.random() * 50) + 10;
      
      const finalResult = {
        ...listing,
        provider: {
          ...providerData,
          hasCertifications,
          certificationFiles,
          servicesCompleted
        },
        clientResidencia,
        recurringClients,
        serviceVariants,
        galleryImages,
        servicesCompleted
      } as ServiceDetailData;
      
      console.log("=== FINAL SERVICE DETAIL RESULT ===");
      console.log("Service title:", finalResult.title);
      console.log("Provider name:", finalResult.provider.name);
      console.log("Service variants count:", finalResult.serviceVariants.length);
      console.log("Gallery images count:", finalResult.galleryImages.length);
      console.log("Final gallery images:", finalResult.galleryImages);
      
      return finalResult;
    },
    enabled: !!serviceId && !!providerId,
    retry: 1
  });

  useEffect(() => {
    if (error) {
      console.error("=== QUERY ERROR ===");
      console.error("Error in service details query:", error);
      toast.error("No se pudo cargar la información del servicio");
    }
  }, [error]);

  return { serviceDetails: data, isLoading, error };
};

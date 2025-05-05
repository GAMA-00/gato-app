import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import ServiceForm from '@/components/services/ServiceForm';
import { Service, ServiceVariant } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Define the shape of the listings data returned from Supabase
interface ListingData {
  id: string;
  title: string;
  service_type_id: string;
  base_price: number;
  duration: number;
  description: string;
  provider_id: string;
  created_at: string;
  service_type?: {
    name: string;
    category?: {
      name: string;
    }
  };
  is_active: boolean;
  updated_at: string;
  service_variants: any; // This is the new property we added to the database
}

const Services = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>(undefined);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_type:service_type_id(
            name,
            category:category_id(name)
          )
        `)
        .eq('provider_id', user.id);
        
      if (error) {
        toast.error('Error loading listings: ' + error.message);
        throw error;
      }
      
      return (data as ListingData[]).map(listing => {
        // Parse service variants if available
        let serviceVariants: ServiceVariant[] = [];
        try {
          if (listing.service_variants) {
            serviceVariants = JSON.parse(JSON.stringify(listing.service_variants));
          }
        } catch (e) {
          console.error("Error parsing service variants:", e);
        }
        
        return {
          id: listing.id,
          name: listing.title,
          subcategoryId: listing.service_type_id,
          category: listing.service_type?.category?.name,
          duration: listing.duration,
          price: listing.base_price,
          description: listing.description,
          residenciaIds: [], // We'll populate this separately
          createdAt: new Date(listing.created_at),
          providerId: listing.provider_id,
          providerName: user.name || '',
          serviceVariants: serviceVariants
        };
      }) as Service[];
    },
    enabled: !!isAuthenticated && !!user?.id
  });
  
  const { data: residenciaAssociations = [] } = useQuery({
    queryKey: ['listing_residencias'],
    queryFn: async () => {
      if (!listings.length) return [];
      
      const { data, error } = await supabase
        .from('listing_residencias')
        .select('*')
        .in('listing_id', listings.map(listing => listing.id));
        
      if (error) {
        toast.error('Error loading residencia associations: ' + error.message);
        throw error;
      }
      
      return data;
    },
    enabled: listings.length > 0
  });
  
  // Fetch provider profile data for additional fields
  const { data: providerData } = useQuery({
    queryKey: ['provider-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching provider data:', error);
        return null;
      }
      
      return data;
    },
    enabled: !!isAuthenticated && !!user?.id
  });
  
  const processedListings = React.useMemo(() => {
    return listings.map(listing => ({
      ...listing,
      residenciaIds: residenciaAssociations
        .filter(assoc => assoc.listing_id === listing.id)
        .map(assoc => assoc.residencia_id),
      // Add provider profile data if available
      aboutMe: providerData?.about_me || '',
      experienceYears: providerData?.experience_years || 0,
    }));
  }, [listings, residenciaAssociations, providerData]);
  
  const createListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!user?.id) throw new Error('User ID is required');
      
      // First, check if the provider record exists
      const { data: providerExists, error: providerCheckError } = await supabase
        .from('providers')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      
      // If provider check fails for any reason other than "not found", throw error
      if (providerCheckError && !providerCheckError.message.includes('No rows found')) {
        throw providerCheckError;
      }
      
      // Upload certification files if provided
      let certificationFilesUrls = [];
      if (serviceData.hasCertifications && serviceData.certificationFiles?.length) {
        try {
          for (const fileObj of serviceData.certificationFiles) {
            const file = fileObj.file;
            if (!file) continue;
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('certifications')
              .upload(fileName, file);
              
            if (uploadError) throw uploadError;
            
            // Get public URL
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
      
      // If provider doesn't exist, create it
      if (!providerExists) {
        const { error: createProviderError } = await supabase
          .from('providers')
          .insert({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone || null,
            about_me: serviceData.aboutMe || '',
            experience_years: serviceData.experienceYears || 0,
            certification_files: certificationFilesUrls.length ? JSON.stringify(certificationFilesUrls) : null,
            average_rating: null
          });
          
        if (createProviderError) {
          toast.error('Error creating provider profile: ' + createProviderError.message);
          throw createProviderError;
        }
      } else {
        // Update provider data if it exists
        const { error: updateProviderError } = await supabase
          .from('providers')
          .update({
            about_me: serviceData.aboutMe,
            experience_years: serviceData.experienceYears,
            certification_files: certificationFilesUrls.length 
              ? JSON.stringify(certificationFilesUrls) 
              : providerExists.certification_files // Preserve existing files if no new ones
          })
          .eq('id', user.id);
          
        if (updateProviderError) {
          console.error('Error updating provider info:', updateProviderError);
        }
      }
      
      // Process service variants if available
      let basePrice = serviceData.price || 0;
      let baseDuration = serviceData.duration || 60;
      
      if (serviceData.serviceVariants && serviceData.serviceVariants.length > 0) {
        // Usar el primer servicio como base
        const baseService = serviceData.serviceVariants[0];
        if (baseService) {
          basePrice = Number(baseService.price) || basePrice;
          baseDuration = Number(baseService.duration) || baseDuration;
        }
      }
      
      // Convert serviceVariants to JSON string for storage
      const serviceVariantsJson = serviceData.serviceVariants 
        ? JSON.stringify(serviceData.serviceVariants) 
        : null;
      
      // Now create the listing
      const { data, error } = await supabase
        .from('listings')
        .insert({
          title: serviceData.name || '',
          service_type_id: serviceData.subcategoryId || '',
          description: serviceData.description || '',
          base_price: basePrice,
          duration: baseDuration,
          provider_id: user.id,
          service_variants: serviceVariantsJson
        })
        .select()
        .maybeSingle();
        
      if (error) throw error;
      
      // Associate with residencias if provided
      if (serviceData.residenciaIds?.length && data?.id) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: data.id,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
      
      // TODO: Handle file uploads for profile image and gallery images
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Anuncio creado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al crear el anuncio: ' + (error as Error).message);
    }
  });
  
  const updateListingMutation = useMutation({
    mutationFn: async (serviceData: Partial<Service>) => {
      if (!serviceData.id) throw new Error('Listing ID is required');
      
      // Upload certification files if provided and hasCertifications is true
      let certificationFilesUrls = [];
      if (serviceData.hasCertifications && serviceData.certificationFiles?.length) {
        try {
          // For update, only process new files (those with a file property)
          const newFilesToUpload = serviceData.certificationFiles.filter(fileObj => fileObj.file);
          
          for (const fileObj of newFilesToUpload) {
            const file = fileObj.file;
            if (!file) continue;
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}/${crypto.randomUUID()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('certifications')
              .upload(fileName, file);
              
            if (uploadError) throw uploadError;
            
            // Get public URL
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
          
          // Preserve existing files that don't have a file property (already uploaded)
          const existingFiles = serviceData.certificationFiles
            .filter(fileObj => !fileObj.file && fileObj.url)
            .map(fileObj => ({
              name: fileObj.name,
              type: fileObj.type,
              size: fileObj.size,
              url: fileObj.url
            }));
            
          certificationFilesUrls = [...existingFiles, ...certificationFilesUrls];
        } catch (error) {
          console.error('Error uploading certification files:', error);
          toast.error('Error al subir certificados');
        }
      }
      
      // Update provider info if available
      if (user?.id && (serviceData.aboutMe !== undefined || 
                        serviceData.experienceYears !== undefined || 
                        serviceData.hasCertifications !== undefined)) {
        // Get current provider data to avoid overwriting existing certification files if none were provided
        let finalCertificationFiles = null;
        
        if (serviceData.hasCertifications) {
          if (certificationFilesUrls.length > 0) {
            // New files uploaded
            finalCertificationFiles = JSON.stringify(certificationFilesUrls);
          } else if (certificationFilesUrls.length === 0 && serviceData.certificationFiles?.length === 0) {
            // No files at all - keep as null
            finalCertificationFiles = null;
          } else {
            // No new files but keep existing files - get from provider record
            const { data: providerData } = await supabase
              .from('providers')
              .select('certification_files')
              .eq('id', user.id)
              .maybeSingle();
              
            finalCertificationFiles = providerData?.certification_files || null;
          }
        } else {
          // Not certified, clear files
          finalCertificationFiles = null;
        }
        
        const { error: updateProviderError } = await supabase
          .from('providers')
          .update({
            about_me: serviceData.aboutMe,
            experience_years: serviceData.experienceYears,
            certification_files: finalCertificationFiles
          })
          .eq('id', user.id);
          
        if (updateProviderError) {
          console.error('Error updating provider info:', updateProviderError);
        }
      }
      
      // Process service variants if available
      let basePrice = serviceData.price || 0;
      let baseDuration = serviceData.duration || 60;
      
      if (serviceData.serviceVariants && serviceData.serviceVariants.length > 0) {
        // Usar el primer servicio como base
        const baseService = serviceData.serviceVariants[0];
        if (baseService) {
          basePrice = Number(baseService.price) || basePrice;
          baseDuration = Number(baseService.duration) || baseDuration;
        }
      }
      
      // Convert serviceVariants to JSON string for storage
      const serviceVariantsJson = serviceData.serviceVariants 
        ? JSON.stringify(serviceData.serviceVariants) 
        : null;
      
      // Update the listing
      const { error } = await supabase
        .from('listings')
        .update({
          title: serviceData.name,
          service_type_id: serviceData.subcategoryId,
          description: serviceData.description,
          base_price: basePrice,
          duration: baseDuration,
          service_variants: serviceVariantsJson
        })
        .eq('id', serviceData.id);
        
      if (error) throw error;
      
      // Update residencia associations
      // First, delete existing associations
      const { error: deleteError } = await supabase
        .from('listing_residencias')
        .delete()
        .eq('listing_id', serviceData.id);
        
      if (deleteError) throw deleteError;
      
      // Then create new ones
      if (serviceData.residenciaIds?.length) {
        const residenciaAssociations = serviceData.residenciaIds.map(residenciaId => ({
          listing_id: serviceData.id!,
          residencia_id: residenciaId
        }));
        
        const { error: residenciaError } = await supabase
          .from('listing_residencias')
          .insert(residenciaAssociations);
          
        if (residenciaError) throw residenciaError;
      }
      
      // TODO: Handle file uploads for profile image and gallery images
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      toast.success('Anuncio actualizado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar el anuncio: ' + (error as Error).message);
    }
  });
  
  const deleteListingMutation = useMutation({
    mutationFn: async (service: Service) => {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', service.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing_residencias'] });
      toast.success('Anuncio eliminado exitosamente');
    },
    onError: (error) => {
      toast.error('Error al eliminar el anuncio: ' + (error as Error).message);
    }
  });
  
  const filteredListings = processedListings.filter(
    service => 
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.subcategoryId?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleAddService = () => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para crear un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(undefined);
    setIsFormOpen(true);
  };
  
  const handleEditService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para editar un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    setEditingService(service);
    setIsFormOpen(true);
  };
  
  const handleDeleteService = (service: Service) => {
    if (!isAuthenticated) {
      toast.error('Debes iniciar sesión para eliminar un anuncio');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    deleteListingMutation.mutate(service);
  };
  
  const handleSubmitService = (serviceData: Partial<Service>) => {
    if (!isAuthenticated || !user) {
      toast.error('Debes iniciar sesión para crear anuncios');
      navigate('/login', { state: { from: '/services' } });
      return;
    }
    
    if (editingService) {
      updateListingMutation.mutate({
        ...serviceData,
        id: editingService.id
      });
    } else {
      createListingMutation.mutate(serviceData);
    }
    
    setIsFormOpen(false);
  };

  return (
    <PageContainer 
      title="Anuncios" 
      subtitle="Administra tus anuncios de servicios"
      action={
        <Button onClick={handleAddService}>
          <Plus className="mr-2 h-4 w-4" />
          Crear Anuncio
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="max-w-md">
          <Input 
            placeholder="Buscar anuncios..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-lg animate-pulse bg-muted"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={handleEditService}
                onDelete={handleDeleteService}
              />
            ))}
            
            {filteredListings.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No se encontraron anuncios. Agrega un nuevo anuncio para comenzar.</p>
              </div>
            )}
          </div>
        )}
        
        <ServiceForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleSubmitService}
          initialData={editingService}
          onDelete={handleDeleteService}
        />
      </div>
    </PageContainer>
  );
};

export default Services;

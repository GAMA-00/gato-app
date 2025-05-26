
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Service, ServiceVariant } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import React from 'react';

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
  service_variants: any;
  gallery_images: any;
}

interface ProviderData {
  id: string;
  about_me?: string;
  experience_years?: number;
  certification_files?: string | null;
}

export const useListings = () => {
  const { user, isAuthenticated } = useAuth();
  
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
        
        // Parse gallery images if available
        let galleryImages: string[] = [];
        try {
          if (listing.gallery_images) {
            const parsed = typeof listing.gallery_images === 'string' 
              ? JSON.parse(listing.gallery_images)
              : listing.gallery_images;
            galleryImages = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          console.error("Error parsing gallery images:", e);
        }
        
        return {
          id: listing.id,
          name: listing.title,
          subcategoryId: listing.service_type_id,
          category: listing.service_type?.category?.name,
          duration: listing.duration,
          price: listing.base_price,
          description: listing.description,
          residenciaIds: [],
          createdAt: new Date(listing.created_at),
          providerId: listing.provider_id,
          providerName: user.name || '',
          serviceVariants: serviceVariants,
          galleryImages: galleryImages
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
  
  const { data: providerData } = useQuery({
    queryKey: ['provider-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('users')
        .select('about_me, experience_years, certification_files')
        .eq('id', user.id)
        .eq('role', 'provider')
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
      aboutMe: providerData?.about_me || '',
      experienceYears: providerData?.experience_years || 0,
    }));
  }, [listings, residenciaAssociations, providerData]);
  
  return {
    listings: processedListings,
    isLoading
  };
};

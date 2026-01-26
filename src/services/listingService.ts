/**
 * ListingService - Data Access Layer for Listings (Services)
 * 
 * Centralizes all Supabase queries related to listings/services.
 * 
 * @see PR #5 - ListingService Layer
 * 
 * IMPORTANT: This service only handles data I/O.
 * UI concerns (toasts, navigation) remain in components/hooks.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { z } from 'zod';

/**
 * DTO for updating listings
 * All fields are optional to support partial updates
 * Note: Complex JSON fields (service_variants, gallery_images, etc.) are not validated with Zod
 * to maintain compatibility with Supabase Json type
 */
export const UpdateListingSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  base_price: z.number().positive().optional(),
  duration: z.number().positive().optional(),
  standard_duration: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  service_variants: z.any().optional(), // Json type from Supabase
  gallery_images: z.any().optional(), // Json type from Supabase
  is_post_payment: z.boolean().optional(),
  use_custom_variables: z.boolean().optional(),
  custom_variable_groups: z.any().optional(), // Json type from Supabase
  availability: z.any().optional(), // Json type from Supabase
  slot_preferences: z.any().optional(), // Json type from Supabase
  // slot_size removed - all slots are now standardized to 60 minutes
  service_type_id: z.string().uuid().optional()
});

export type UpdateListingDTO = z.infer<typeof UpdateListingSchema>;

/**
 * ListingService - Static class for listing operations
 */
export class ListingService {
  /**
   * Get active listings, optionally filtered by provider
   * Used by: Client-facing pages, search, booking flows
   */
  static async getActiveListings(providerId?: string) {
    logger.debug(`getActiveListings - providerId: ${providerId || 'all'}`);

    let query = supabase
      .from('listings')
      .select(`
        *,
        service_types(
          id,
          name,
          category_id,
          service_categories(
            id,
            name,
            label
          )
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('getActiveListings - Error:', error);
      throw error;
    }

    logger.debug(`getActiveListings - Fetched ${data?.length || 0} listings`);
    return data || [];
  }

  /**
   * Get a single listing by ID with full relations
   * Used by: Service detail pages, booking flows
   */
  static async getListingById(id: string) {
    logger.debug(`getListingById - id: ${id}`);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        service_types(
          id,
          name,
          category_id,
          service_categories(
            id,
            name,
            label,
            icon
          )
        ),
        users!listings_provider_id_fkey(
          id,
          name,
          avatar_url,
          about_me,
          average_rating,
          experience_years
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      logger.error('getListingById - Error:', error);
      throw error;
    }

    logger.debug(`getListingById - Fetched listing: ${data?.id}`);
    return data;
  }

  /**
   * Update a listing
   * Used by: Service edit pages, admin panels
   */
  static async updateListing(id: string, data: UpdateListingDTO) {
    // Validate input with Zod
    const validatedData = UpdateListingSchema.parse(data);
    
    logger.debug(`updateListing - id: ${id}, fields: ${Object.keys(validatedData).join(', ')}`);

    const { data: updated, error } = await supabase
      .from('listings')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('updateListing - Error:', error);
      throw error;
    }

    logger.debug(`updateListing - Updated listing: ${updated?.id}`);
    return updated;
  }

  /**
   * Get all listings for a specific provider
   * Used by: Provider dashboard, service management pages
   */
  static async getProviderListings(providerId: string) {
    logger.debug(`getProviderListings - providerId: ${providerId}`);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        service_types(
          id,
          name,
          category_id,
          service_categories(
            id,
            name,
            label
          )
        )
      `)
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('getProviderListings - Error:', error);
      throw error;
    }

    logger.debug(`getProviderListings - Fetched ${data?.length || 0} listings`);
    return data || [];
  }

  /**
   * Get listing with residencias (for availability/coverage checks)
   * Used by: Booking flows, availability checks
   */
  static async getListingWithResidencias(listingId: string) {
    logger.debug(`getListingWithResidencias - listingId: ${listingId}`);

    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        listing_residencias(
          residencia_id,
          residencias(
            id,
            name,
            address
          )
        )
      `)
      .eq('id', listingId)
      .single();

    if (error) {
      logger.error('getListingWithResidencias - Error:', error);
      throw error;
    }

    logger.debug('getListingWithResidencias - Fetched listing with residencias');
    return data;
  }

  /**
   * Get listings with basic info only (lightweight)
   * Used by: Dropdowns, selectors, quick previews
   */
  static async getListingsBasic(providerId?: string) {
    logger.debug(`getListingsBasic - providerId: ${providerId || 'all'}`);

    let query = supabase
      .from('listings')
      .select('id, title, base_price, duration, is_active')
      .order('title', { ascending: true });

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('getListingsBasic - Error:', error);
      throw error;
    }

    logger.debug(`getListingsBasic - Fetched ${data?.length || 0} listings`);
    return data || [];
  }

  /**
   * Get active listings with provider info (for client-facing lists)
   * Used by: Client provider lists, search results
   */
  static async getActiveListingsWithProvider(serviceTypeId?: string) {
    logger.debug(`getActiveListingsWithProvider - serviceTypeId: ${serviceTypeId || 'all'}`);

    let query = supabase
      .from('listings')
      .select(`
        id,
        title,
        description,
        base_price,
        users!listings_provider_id_fkey (
          id,
          name,
          avatar_url,
          average_rating
        )
      `)
      .eq('is_active', true);

    if (serviceTypeId) {
      query = query.eq('service_type_id', serviceTypeId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('getActiveListingsWithProvider - Error:', error);
      throw error;
    }

    logger.debug(`getActiveListingsWithProvider - Fetched ${data?.length || 0} listings`);
    return data || [];
  }
}

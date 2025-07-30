import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WeeklyAvailability } from '@/lib/types';
import { toast } from 'sonner';

interface UnifiedAvailabilityContextType {
  syncAvailabilityToListing: (availability: WeeklyAvailability) => Promise<void>;
  loadAvailabilityFromListing: () => Promise<WeeklyAvailability | null>;
  notifyAvailabilityChange: () => void;
}

const UnifiedAvailabilityContext = createContext<UnifiedAvailabilityContextType | undefined>(undefined);

export const useUnifiedAvailability = () => {
  const context = useContext(UnifiedAvailabilityContext);
  if (!context) {
    throw new Error('useUnifiedAvailability must be used within UnifiedAvailabilityProvider');
  }
  return context;
};

export const UnifiedAvailabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const syncAvailabilityToListing = useCallback(async (availability: WeeklyAvailability) => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      console.log('Syncing availability to all user listings:', availability);
      
      // Update ALL user's active listings with the availability data
      const { data: updatedListings, error: updateError } = await supabase
        .from('listings')
        .update({
          availability: availability // Supabase will handle JSON serialization
        })
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .select('id');

      if (updateError) {
        console.error('Error updating listings availability:', updateError);
        throw updateError;
      }

      console.log(`Availability synchronized to ${updatedListings?.length || 0} active listings successfully`);
    } catch (error) {
      console.error('Error in syncAvailabilityToListing:', error);
      throw error;
    }
  }, [user?.id]);

  const loadAvailabilityFromListing = useCallback(async (): Promise<WeeklyAvailability | null> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // Get provider's listing with availability
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select('availability')
        .eq('provider_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (listingError) {
        console.error('Error getting provider listing:', listingError);
        throw listingError;
      }

      if (!listing || !listing.availability) {
        console.log('No availability data in listing');
        return null;
      }

      // Parse and return availability
      const availability = typeof listing.availability === 'string' 
        ? JSON.parse(listing.availability)
        : listing.availability;

      return availability as WeeklyAvailability;
    } catch (error) {
      console.error('Error in loadAvailabilityFromListing:', error);
      return null;
    }
  }, [user?.id]);

  const notifyAvailabilityChange = useCallback(() => {
    // Invalidate all availability-related caches for a complete refresh
    queryClient.invalidateQueries({ queryKey: ['provider-availability', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['listings', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['listings'] }); // General listings cache
    queryClient.invalidateQueries({ queryKey: ['provider_time_slots'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-slots'] });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
    
    console.log('Availability change notified - all related caches invalidated');
  }, [queryClient, user?.id]);

  return (
    <UnifiedAvailabilityContext.Provider value={{
      syncAvailabilityToListing,
      loadAvailabilityFromListing,
      notifyAvailabilityChange
    }}>
      {children}
    </UnifiedAvailabilityContext.Provider>
  );
};
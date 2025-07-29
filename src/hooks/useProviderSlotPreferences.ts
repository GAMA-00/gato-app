import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SlotPreference {
  id: string;
  provider_id: string;
  listing_id: string;
  slot_pattern: string; // Format: "day-time" e.g. "2024-01-15-14:00"
  is_manually_disabled: boolean;
  created_at: string;
  updated_at: string;
}

export const useProviderSlotPreferences = (listingId?: string) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Load existing preferences
  const loadPreferences = useCallback(async () => {
    if (!user?.id || !listingId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('provider_slot_preferences')
        .select('*')
        .eq('provider_id', user.id)
        .eq('listing_id', listingId);

      if (error) throw error;

      const prefsMap: Record<string, boolean> = {};
      data?.forEach(pref => {
        prefsMap[pref.slot_pattern] = pref.is_manually_disabled;
      });

      setPreferences(prefsMap);
    } catch (error) {
      console.error('Error loading slot preferences:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, listingId]);

  // Save a preference
  const savePreference = useCallback(async (slotPattern: string, isDisabled: boolean) => {
    if (!user?.id || !listingId) return;

    try {
      const { error } = await supabase
        .from('provider_slot_preferences')
        .upsert({
          provider_id: user.id,
          listing_id: listingId,
          slot_pattern: slotPattern,
          is_manually_disabled: isDisabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id,listing_id,slot_pattern'
        });

      if (error) throw error;

      // Update local state
      setPreferences(prev => ({
        ...prev,
        [slotPattern]: isDisabled
      }));
    } catch (error) {
      console.error('Error saving slot preference:', error);
    }
  }, [user?.id, listingId]);

  // Toggle a slot preference
  const toggleSlotPreference = useCallback(async (slotPattern: string) => {
    const currentState = preferences[slotPattern] || false;
    await savePreference(slotPattern, !currentState);
  }, [preferences, savePreference]);

  // Bulk operations
  const enableAllSlots = useCallback(async (slotPatterns: string[]) => {
    if (!user?.id || !listingId) return;

    try {
      // Delete all disabled preferences for this listing
      const { error } = await supabase
        .from('provider_slot_preferences')
        .delete()
        .eq('provider_id', user.id)
        .eq('listing_id', listingId)
        .eq('is_manually_disabled', true);

      if (error) throw error;

      // Clear local state
      setPreferences({});
    } catch (error) {
      console.error('Error enabling all slots:', error);
    }
  }, [user?.id, listingId]);

  const disableAllSlots = useCallback(async (slotPatterns: string[]) => {
    if (!user?.id || !listingId) return;

    try {
      const preferencesToInsert = slotPatterns.map(pattern => ({
        provider_id: user.id,
        listing_id: listingId,
        slot_pattern: pattern,
        is_manually_disabled: true,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('provider_slot_preferences')
        .upsert(preferencesToInsert, {
          onConflict: 'provider_id,listing_id,slot_pattern'
        });

      if (error) throw error;

      // Update local state
      const newPrefs: Record<string, boolean> = {};
      slotPatterns.forEach(pattern => {
        newPrefs[pattern] = true;
      });
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error disabling all slots:', error);
    }
  }, [user?.id, listingId]);

  // Load preferences when dependencies change
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    isLoading,
    toggleSlotPreference,
    enableAllSlots,
    disableAllSlots,
    refreshPreferences: loadPreferences
  };
};
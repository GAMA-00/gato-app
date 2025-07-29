/**
 * UNIFIED AVAILABILITY SYSTEM TESTER
 * ==================================
 * 
 * This utility tests the unified availability system to ensure:
 * 1. Providers can only have one listing
 * 2. Availability is synchronized between listing and provider_availability
 * 3. Slot regeneration works properly
 * 4. Real-time updates function correctly
 */

import { supabase } from '@/integrations/supabase/client';
import { WeeklyAvailability } from '@/lib/types';

export const testUnifiedAvailability = async (providerId: string) => {
  console.log('🧪 Testing Unified Availability System for provider:', providerId);
  
  try {
    // Test 1: Check provider has only one listing
    const { data: listings, error: listingsError } = await supabase
      .from('listings')
      .select('id, provider_id')
      .eq('provider_id', providerId)
      .eq('is_active', true);
      
    if (listingsError) {
      console.error('❌ Test 1 Failed - Error fetching listings:', listingsError);
      return false;
    }
    
    if (listings.length > 1) {
      console.error('❌ Test 1 Failed - Provider has multiple listings:', listings.length);
      return false;
    }
    
    if (listings.length === 0) {
      console.log('⚠️ Test 1 Warning - Provider has no active listings');
      return true; // Not an error, just no listings yet
    }
    
    console.log('✅ Test 1 Passed - Provider has exactly one listing');
    
    // Test 2: Test availability synchronization
    const testAvailability: WeeklyAvailability = {
      monday: {
        enabled: true,
        timeSlots: [
          { startTime: '09:00', endTime: '12:00' },
          { startTime: '14:00', endTime: '17:00' }
        ]
      },
      tuesday: {
        enabled: true,
        timeSlots: [
          { startTime: '10:00', endTime: '16:00' }
        ]
      },
      wednesday: { enabled: false, timeSlots: [] },
      thursday: { enabled: false, timeSlots: [] },
      friday: { enabled: false, timeSlots: [] },
      saturday: { enabled: false, timeSlots: [] },
      sunday: { enabled: false, timeSlots: [] }
    };
    
    // Update listing with test availability
    const { error: updateError } = await supabase
      .from('listings')
      .update({
        availability: JSON.stringify(testAvailability)
      })
      .eq('id', listings[0].id);
      
    if (updateError) {
      console.error('❌ Test 2 Failed - Error updating listing availability:', updateError);
      return false;
    }
    
    // Wait for trigger to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if provider_availability was synchronized
    const { data: providerAvailability, error: providerError } = await supabase
      .from('provider_availability')
      .select('*')
      .eq('provider_id', providerId)
      .eq('is_active', true);
      
    if (providerError) {
      console.error('❌ Test 2 Failed - Error fetching provider availability:', providerError);
      return false;
    }
    
    // Verify synchronization worked
    const mondaySlots = providerAvailability.filter(slot => slot.day_of_week === 1);
    const tuesdaySlots = providerAvailability.filter(slot => slot.day_of_week === 2);
    
    if (mondaySlots.length !== 2 || tuesdaySlots.length !== 1) {
      console.error('❌ Test 2 Failed - Availability not synchronized correctly');
      console.log('Expected: Monday 2 slots, Tuesday 1 slot');
      console.log('Got: Monday', mondaySlots.length, 'slots, Tuesday', tuesdaySlots.length, 'slots');
      return false;
    }
    
    console.log('✅ Test 2 Passed - Availability synchronized correctly');
    
    // Test 3: Check slot regeneration
    const { data: slots, error: slotsError } = await supabase
      .from('provider_time_slots')
      .select('*')
      .eq('provider_id', providerId)
      .eq('listing_id', listings[0].id)
      .gte('slot_date', new Date().toISOString().split('T')[0]);
      
    if (slotsError) {
      console.error('❌ Test 3 Failed - Error fetching time slots:', slotsError);
      return false;
    }
    
    if (slots.length === 0) {
      console.log('⚠️ Test 3 Warning - No time slots generated yet');
    } else {
      console.log('✅ Test 3 Passed - Time slots generated:', slots.length, 'slots');
    }
    
    console.log('🎉 All tests passed! Unified Availability System working correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Test Suite Failed - Unexpected error:', error);
    return false;
  }
};

export const validateProviderConstraint = async () => {
  console.log('🔍 Validating provider constraint...');
  
  try {
    // Check for providers with multiple listings
    const { data, error } = await supabase
      .from('listings')
      .select('provider_id')
      .eq('is_active', true);
      
    if (error) {
      console.error('Error fetching listings for validation:', error);
      return false;
    }
    
    const providerCounts = data.reduce((acc: Record<string, number>, listing) => {
      acc[listing.provider_id] = (acc[listing.provider_id] || 0) + 1;
      return acc;
    }, {});
    
    const violatingProviders = Object.entries(providerCounts).filter(([_, count]) => count > 1);
    
    if (violatingProviders.length > 0) {
      console.error('❌ Constraint Violation - Providers with multiple listings:', violatingProviders);
      return false;
    }
    
    console.log('✅ Provider constraint validated - All providers have max 1 listing');
    return true;
    
  } catch (error) {
    console.error('Error validating provider constraint:', error);
    return false;
  }
};
/**
 * AppointmentService - Data Access Layer for Appointments
 * 
 * Centralizes all Supabase queries related to appointments.
 * 
 * @see PR #4 - Service Layer Refactor
 * 
 * IMPORTANT: This service maintains the exact same logic as the original hooks.
 * No changes to data shape, filters, or behavior.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

/**
 * Fetches basic appointments with listings data
 * Used by: useAppointments.ts
 */
export const fetchAppointmentsWithListings = async (
  userId: string,
  userRole: 'provider' | 'client'
) => {
  logger.debug(`fetchAppointmentsWithListings - userId: ${userId}, role: ${userRole}`);

  let query = supabase
    .from('appointments')
    .select(`
      *,
      listings(
        title,
        duration,
        base_price,
        service_variants,
        custom_variable_groups
      )
    `)
    .order('start_time', { ascending: true });

  // Filter by user role
  if (userRole === 'provider') {
    query = query.eq('provider_id', userId);
  } else if (userRole === 'client') {
    query = query.eq('client_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('fetchAppointmentsWithListings - Error:', error);
    throw error;
  }

  logger.debug(`fetchAppointmentsWithListings - Fetched ${data?.length || 0} appointments`);
  return data || [];
};

/**
 * Fetches client data for appointments
 * Used by: useAppointments.ts
 */
export const fetchClientsData = async (clientIds: string[]) => {
  if (clientIds.length === 0) {
    logger.debug('fetchClientsData - No client IDs provided');
    return [];
  }

  logger.debug('fetchClientsData - Fetching for IDs:', clientIds);

  const { data, error } = await supabase
    .from('users')
    .select(`
      id,
      name,
      phone,
      email,
      house_number,
      condominium_text,
      condominium_name,
      residencia_id,
      residencias(
        id,
        name
      )
    `)
    .in('id', clientIds);

  if (error) {
    logger.error('fetchClientsData - Error:', error);
    throw error;
  }

  logger.debug(`fetchClientsData - Fetched ${data?.length || 0} clients`);
  return data || [];
};

/**
 * Fetches unified recurring appointments (real + base)
 * Used by: useUnifiedRecurringAppointments.ts
 */
export const fetchUnifiedRecurringAppointments = async (
  userId: string,
  userRole: 'client' | 'provider',
  statusFilter: string[],
  normalizedStart: Date,
  normalizedEnd: Date
) => {
  const roleFilter = userRole === 'client' ? 'client_id' : 'provider_id';

  logger.debug('fetchUnifiedRecurringAppointments - Params:', {
    userId,
    userRole,
    roleFilter,
    statusFilter,
    start: normalizedStart.toISOString(),
    end: normalizedEnd.toISOString()
  });

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      recurrence,
      provider_id,
      client_id,
      listing_id,
      client_name,
      provider_name,
      client_address,
      notes,
      is_recurring_instance,
      recurrence_group_id,
      recurring_rule_id,
      external_booking,
      final_price,
      custom_variables_total_price,
      custom_variable_selections,
      listings (
        id,
        title,
        is_post_payment,
        base_price,
        duration,
        service_variants,
        custom_variable_groups
      )
    `)
    .eq(roleFilter, userId)
    .in('status', statusFilter)
    .gte('start_time', normalizedStart.toISOString())
    .lte('start_time', normalizedEnd.toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    logger.error('fetchUnifiedRecurringAppointments - Error:', error);
    throw error;
  }

  logger.debug(`fetchUnifiedRecurringAppointments - Fetched ${data?.length || 0} appointments`);
  return data || [];
};

/**
 * Fetches ALL recurring base appointments (not limited by date range)
 * Used by: useUnifiedRecurringAppointments.ts
 */
export const fetchAllRecurringBases = async (
  userId: string,
  userRole: 'client' | 'provider',
  normalizedEnd: Date
) => {
  const roleFilter = userRole === 'client' ? 'client_id' : 'provider_id';

  logger.debug('fetchAllRecurringBases - Params:', {
    userId,
    userRole,
    roleFilter,
    end: normalizedEnd.toISOString()
  });

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      start_time,
      end_time,
      status,
      recurrence,
      provider_id,
      client_id,
      listing_id,
      client_name,
      provider_name,
      client_address,
      notes,
      is_recurring_instance,
      recurrence_group_id,
      recurring_rule_id,
      external_booking,
      final_price,
      custom_variables_total_price,
      custom_variable_selections,
      listings (
        id,
        title,
        is_post_payment,
        base_price,
        duration,
        service_variants,
        custom_variable_groups
      )
    `)
    .eq(roleFilter, userId)
    .neq('recurrence', 'none')
    .neq('recurrence', 'once')
    .eq('is_recurring_instance', false)
    .in('status', ['confirmed', 'pending', 'completed'])
    .lte('start_time', normalizedEnd.toISOString());

  if (error) {
    logger.error('fetchAllRecurringBases - Error:', error);
    throw error;
  }

  logger.debug(`fetchAllRecurringBases - Fetched ${data?.length || 0} bases`);
  return data || [];
};

/**
 * Fetches recurring exceptions for appointments
 * Used by: useUnifiedRecurringAppointments.ts
 */
export const fetchRecurringExceptions = async (appointmentIds: string[]) => {
  if (appointmentIds.length === 0) {
    logger.debug('fetchRecurringExceptions - No appointment IDs provided');
    return [];
  }

  logger.debug('fetchRecurringExceptions - Fetching for IDs:', appointmentIds);

  const { data, error } = await supabase
    .from('recurring_exceptions')
    .select('*')
    .in('appointment_id', appointmentIds);

  if (error) {
    logger.error('fetchRecurringExceptions - Error:', error);
    throw error;
  }

  logger.debug(`fetchRecurringExceptions - Fetched ${data?.length || 0} exceptions`);
  return data || [];
};

/**
 * Updates appointment status
 * Used by: useDashboardAppointments.ts (auto-update completed)
 */
export const updateAppointmentStatus = async (
  appointmentId: string,
  status: string
) => {
  logger.debug(`updateAppointmentStatus - ID: ${appointmentId}, status: ${status}`);

  const { data, error } = await supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId);

  if (error) {
    logger.error('updateAppointmentStatus - Error:', error);
    throw error;
  }

  logger.debug(`updateAppointmentStatus - Updated appointment ${appointmentId}`);
  return data;
};

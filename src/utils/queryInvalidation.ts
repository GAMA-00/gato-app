import { QueryClient } from "@tanstack/react-query";

/**
 * Utilidades centralizadas para invalidación de queries en React Query
 * 
 * Objetivo: Reducir refetches innecesarios y consolidar invalidaciones
 * en un solo lugar para mejor mantenibilidad.
 * 
 * @see PR #3 - Query Invalidation Utils
 */

/**
 * Invalida queries de appointments
 * @param qc - QueryClient de React Query
 * @param userId - ID del usuario (opcional, si se usa en queryKey)
 */
export const invalidateAppointments = (qc: QueryClient, userId?: string) =>
  qc.invalidateQueries({ 
    queryKey: userId ? ["appointments", userId] : ["appointments"] 
  });

/**
 * Invalida queries de calendar appointments
 * @param qc - QueryClient de React Query
 * @param userId - ID del usuario (opcional, si se usa en queryKey)
 */
export const invalidateCalendarAppointments = (qc: QueryClient, userId?: string) =>
  qc.invalidateQueries({ 
    queryKey: userId ? ["calendar-appointments", userId] : ["calendar-appointments"] 
  });

/**
 * Invalida queries de listings
 * @param qc - QueryClient de React Query
 * @param userId - ID del usuario/provider (opcional, si se usa en queryKey)
 */
export const invalidateListings = (qc: QueryClient, userId?: string) =>
  qc.invalidateQueries({ 
    queryKey: userId ? ["listings", userId] : ["listings"] 
  });

/**
 * Invalida queries de user profile
 * @param qc - QueryClient de React Query
 * @param userId - ID del usuario (opcional, si se usa en queryKey)
 */
export const invalidateUserProfile = (qc: QueryClient, userId?: string) =>
  Promise.all([
    qc.invalidateQueries({ 
      queryKey: userId ? ["user-profile", userId] : ["user-profile"] 
    }),
    qc.invalidateQueries({ 
      queryKey: userId ? ["provider-profile", userId] : ["provider-profile"] 
    }),
    qc.invalidateQueries({ queryKey: ["providers"] })
  ]);

/**
 * Invalida todas las queries relacionadas con disponibilidad de un proveedor
 * @param qc - QueryClient de React Query
 * @param providerId - ID del proveedor
 */
export const invalidateProviderAvailability = (qc: QueryClient, providerId: string) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ["provider-availability", providerId] }),
    qc.invalidateQueries({ queryKey: ["availability-settings", providerId] }),
    qc.invalidateQueries({ queryKey: ["provider_time_slots", providerId] }),
    qc.invalidateQueries({ queryKey: ["weekly-slots", providerId] }),
    qc.invalidateQueries({ queryKey: ["unified-availability", providerId] })
  ]);

/**
 * Invalida queries de time slots del proveedor
 * @param qc - QueryClient de React Query
 * @param providerId - ID del proveedor
 */
export const invalidateProviderSlots = (qc: QueryClient, providerId: string) =>
  Promise.all([
    qc.invalidateQueries({ queryKey: ["provider_time_slots", providerId] }),
    qc.invalidateQueries({ queryKey: ["weekly-slots", providerId] }),
    qc.invalidateQueries({ queryKey: ["provider-slots", providerId] }),
    qc.invalidateQueries({ queryKey: ["calendar-appointments", providerId] })
  ]);

/**
 * Forzar sincronización completa de todos los datos críticos del proveedor
 * @param qc - QueryClient de React Query
 * @param userId - ID del usuario/provider
 */
export const forceFullProviderSync = async (qc: QueryClient, userId: string) => {
  // Invalidar TODOS los caches
  await Promise.all([
    invalidateListings(qc, userId),
    invalidateProviderAvailability(qc, userId),
    invalidateProviderSlots(qc, userId),
    invalidateUserProfile(qc, userId),
    invalidateCalendarAppointments(qc, userId)
  ]);

  // Forzar refetch de datos críticos
  await Promise.all([
    qc.refetchQueries({ queryKey: ["listings", userId] }),
    qc.refetchQueries({ queryKey: ["user-profile", userId] }),
    qc.refetchQueries({ queryKey: ["provider-availability", userId] })
  ]);
};

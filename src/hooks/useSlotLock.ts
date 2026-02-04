import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SLOT_SYSTEM } from '@/lib/slotSystemConstants';

interface UseSlotLockReturn {
  /** Whether the lock is currently held */
  isLocked: boolean;
  /** When the lock expires (null if not locked) */
  lockExpiry: Date | null;
  /** Error message if lock acquisition failed */
  error: string | null;
  /** Time remaining in milliseconds */
  timeRemaining: number;
  /** Attempt to acquire the lock */
  acquireLock: () => Promise<boolean>;
  /** Manually release the lock */
  releaseLock: () => Promise<void>;
  /** Whether the lock is being acquired */
  isAcquiring: boolean;
}

/**
 * Hook para gestionar el lock de 5 minutos durante el proceso de checkout.
 * 
 * Cuando el usuario inicia el checkout, se bloquean los slots seleccionados
 * por 5 minutos para prevenir overbooking. Si no completa el pago, el lock
 * expira automáticamente y los slots se liberan.
 * 
 * NOTA: Usa la columna blocked_until existente en provider_time_slots.
 * Una migración futura agregará la función RPC lock_slots_for_checkout
 * para manejo atómico de locks.
 * 
 * @param slotIds - Array de IDs de slots a bloquear
 * @returns Estado y funciones para gestionar el lock
 */
export function useSlotLock(slotIds: string[]): UseSlotLockReturn {
  const [isLocked, setIsLocked] = useState(false);
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isAcquiring, setIsAcquiring] = useState(false);
  
  // Track current slotIds to prevent stale closures
  const slotIdsRef = useRef(slotIds);
  slotIdsRef.current = slotIds;
  
  // Timer ref for countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Acquire lock on the specified slots using blocked_until column
   */
  const acquireLock = useCallback(async (): Promise<boolean> => {
    const currentSlotIds = slotIdsRef.current;
    
    if (currentSlotIds.length === 0) {
      setError('No hay slots para bloquear');
      return false;
    }
    
    setIsAcquiring(true);
    setError(null);
    
    try {
      const lockUntil = new Date(Date.now() + SLOT_SYSTEM.CHECKOUT_LOCK_MINUTES * 60 * 1000);
      const lockUntilStr = lockUntil.toISOString().split('T')[0]; // blocked_until is DATE type
      
      // First check if slots are available and not already locked
      const { data: slotsCheck, error: checkError } = await supabase
        .from('provider_time_slots')
        .select('id, is_available, is_reserved, blocked_until')
        .in('id', currentSlotIds);
      
      if (checkError) {
        console.error('Error checking slots:', checkError);
        setError('Error al verificar disponibilidad');
        return false;
      }
      
      // Check if any slot is unavailable or already locked
      const unavailableSlot = slotsCheck?.find(s => 
        !s.is_available || 
        s.is_reserved || 
        (s.blocked_until && new Date(s.blocked_until) > new Date())
      );
      
      if (unavailableSlot) {
        setError('Los slots ya no están disponibles. Otro cliente los reservó.');
        return false;
      }
      
      // Apply the lock using blocked_until
      const { error: updateError } = await supabase
        .from('provider_time_slots')
        .update({ blocked_until: lockUntilStr })
        .in('id', currentSlotIds)
        .eq('is_available', true)
        .eq('is_reserved', false);
      
      if (updateError) {
        console.error('Error acquiring slot lock:', updateError);
        setError('Error al reservar los slots. Intente nuevamente.');
        return false;
      }
      
      // Lock acquired successfully
      setIsLocked(true);
      setLockExpiry(lockUntil);
      setTimeRemaining(SLOT_SYSTEM.CHECKOUT_LOCK_MINUTES * 60 * 1000);
      
      console.log('✅ Lock adquirido para slots:', currentSlotIds.length);
      return true;
      
    } catch (err) {
      console.error('Exception acquiring slot lock:', err);
      setError('Error de conexión al reservar slots');
      return false;
    } finally {
      setIsAcquiring(false);
    }
  }, []);

  /**
   * Release the lock manually (e.g., user abandons checkout)
   */
  const releaseLock = useCallback(async (): Promise<void> => {
    const currentSlotIds = slotIdsRef.current;
    
    if (!isLocked || currentSlotIds.length === 0) {
      return;
    }
    
    try {
      // Update slots to remove the lock
      const { error: updateError } = await supabase
        .from('provider_time_slots')
        .update({ blocked_until: null })
        .in('id', currentSlotIds);
      
      if (updateError) {
        console.error('Error releasing slot lock:', updateError);
        // Don't throw - the lock will expire automatically anyway
      } else {
        console.log('🔓 Lock liberado para slots:', currentSlotIds.length);
      }
      
    } catch (err) {
      console.error('Exception releasing slot lock:', err);
    } finally {
      setIsLocked(false);
      setLockExpiry(null);
      setTimeRemaining(0);
    }
  }, [isLocked]);

  // Countdown timer effect
  useEffect(() => {
    if (!isLocked || !lockExpiry) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, lockExpiry.getTime() - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Lock expired
        setIsLocked(false);
        setLockExpiry(null);
        setError('El tiempo para completar el pago ha expirado. Los slots han sido liberados.');
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLocked, lockExpiry]);

  // Auto-release on unmount (user leaves checkout page)
  useEffect(() => {
    return () => {
      if (isLocked && slotIdsRef.current.length > 0) {
        // Fire-and-forget release using .then()
        supabase
          .from('provider_time_slots')
          .update({ blocked_until: null })
          .in('id', slotIdsRef.current)
          .then(({ error }) => {
            if (error) {
              console.warn('Error releasing lock on unmount:', error);
            } else {
              console.log('🔓 Lock liberado en unmount');
            }
          });
      }
    };
  }, [isLocked]);

  return {
    isLocked,
    lockExpiry,
    error,
    timeRemaining,
    acquireLock,
    releaseLock,
    isAcquiring
  };
}

/**
 * Formats remaining time as MM:SS
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

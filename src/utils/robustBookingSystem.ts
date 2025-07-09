import { toast } from 'sonner';

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  error?: string;
  shouldRetry?: boolean;
  data?: any;
}

export interface BookingAttemptResult {
  success: boolean;
  data?: any;
  error?: any;
  shouldRetry: boolean;
}

export class RobustBookingSystem {
  private maxAttempts = 3;
  private baseDelay = 1000; // 1 second
  private maxDelay = 5000; // 5 seconds

  async executeBooking<T>(
    bookingFunction: () => Promise<T>,
    options?: {
      maxAttempts?: number;
      showProgress?: boolean;
      optimisticValidation?: boolean;
    }
  ): Promise<BookingResult> {
    const { 
      maxAttempts = this.maxAttempts, 
      showProgress = true,
      optimisticValidation = true 
    } = options || {};

    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (showProgress && attempt > 1) {
          const delay = this.calculateDelay(attempt);
          toast.info(`Reintentando reserva... (${attempt}/${maxAttempts})`, { 
            duration: delay 
          });
          await this.wait(delay);
        }

        console.log(`🔄 Booking attempt ${attempt}/${maxAttempts}`);
        const result = await bookingFunction();

        if (result) {
          console.log('✅ Booking successful on attempt', attempt);
          return {
            success: true,
            appointmentId: (result as any)?.id,
            data: result
          };
        } else {
          throw new Error('Booking function returned null/undefined');
        }

      } catch (error: any) {
        console.error(`❌ Booking attempt ${attempt} failed:`, error);
        lastError = error;

        // Check if we should retry based on error type
        const shouldRetry = this.shouldRetryError(error);
        
        if (!shouldRetry) {
          console.log('🚫 Error is non-retryable, stopping attempts');
          return {
            success: false,
            error: this.getErrorMessage(error),
            shouldRetry: false
          };
        }

        // If this was the last attempt, break
        if (attempt === maxAttempts) {
          break;
        }
      }
    }

    // All attempts failed
    console.error('💥 All booking attempts failed');
    return {
      success: false,
      error: this.getErrorMessage(lastError),
      shouldRetry: false
    };
  }

  private shouldRetryError(error: any): boolean {
    // Enhanced retry logic based on new database constraint behavior
    const nonRetryableErrors = [
      '23505', // Unique constraint violation (should be rare now)
      '23503', // Foreign key constraint violation
      '23514', // Check constraint violation
      'conflict',
      'already exists',
      'ya existe',
      'unique_active_appointment_slot' // Our new constraint
    ];

    const errorStr = (error?.code || error?.message || '').toLowerCase();
    
    // Don't retry if it's a definitive conflict
    const shouldNotRetry = nonRetryableErrors.some(nonRetryable => 
      errorStr.includes(nonRetryable.toLowerCase())
    );

    if (shouldNotRetry) {
      console.log('🚫 Non-retryable error detected:', errorStr);
      return false;
    }

    // Retry on network, timeout, and temporary errors
    const retryableErrors = ['timeout', 'network', 'connection', 'temporary'];
    const shouldRetry = retryableErrors.some(retryable => 
      errorStr.includes(retryable.toLowerCase())
    );

    console.log('🔄 Retry decision:', { shouldRetry, errorStr });
    return shouldRetry;
  }

  private getErrorMessage(error: any): string {
    if (!error) return 'Error desconocido';

    // Enhanced error messages for new database constraint logic
    if (error.code === '23505') {
      if (error.message?.includes('unique_active_appointment_slot')) {
        return 'Ya existe una cita activa para este horario. Las citas canceladas se liberan automáticamente.';
      }
      return 'Este horario ya fue reservado. Por favor selecciona otro.';
    }
    
    if (error.code === '23503') {
      return 'Error en los datos de la reserva. Por favor intenta de nuevo.';
    }
    
    if (error.code === '23514') {
      return 'Los datos no cumplen con los requisitos del sistema.';
    }
    
    if (error.message?.includes('timeout')) {
      return 'La operación tardó demasiado. Tu reserva podría haberse creado.';
    }
    
    if (error.message?.includes('network')) {
      return 'Error de conexión. Verifica tu internet e intenta de nuevo.';
    }

    if (error.message?.includes('unique_active_appointment_slot')) {
      return 'Este horario ya está reservado por otra cita activa.';
    }

    return error.message || 'Error al procesar la reserva';
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 200; // Add up to 200ms random jitter
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static convenience method
  static async createBooking<T>(
    bookingFunction: () => Promise<T>,
    options?: {
      maxAttempts?: number;
      showProgress?: boolean;
      optimisticValidation?: boolean;
    }
  ): Promise<BookingResult> {
    const system = new RobustBookingSystem();
    return system.executeBooking(bookingFunction, options);
  }
}

// Enhanced booking state management
export interface BookingState {
  isLoading: boolean;
  step: 'idle' | 'validating' | 'creating' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
  canRetry: boolean;
}

export class BookingStateManager {
  private listeners: ((state: BookingState) => void)[] = [];
  private currentState: BookingState = {
    isLoading: false,
    step: 'idle',
    progress: 0,
    message: '',
    canRetry: false
  };

  subscribe(listener: (state: BookingState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  updateState(updates: Partial<BookingState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.listeners.forEach(listener => listener(this.currentState));
  }

  getState(): BookingState {
    return { ...this.currentState };
  }

  reset(): void {
    this.updateState({
      isLoading: false,
      step: 'idle',
      progress: 0,
      message: '',
      canRetry: false
    });
  }

  startBooking(): void {
    this.updateState({
      isLoading: true,
      step: 'validating',
      progress: 10,
      message: 'Validando disponibilidad...',
      canRetry: false
    });
  }

  setCreating(): void {
    this.updateState({
      step: 'creating',
      progress: 50,
      message: 'Creando tu reserva...'
    });
  }

  setFinalizing(): void {
    this.updateState({
      step: 'finalizing',
      progress: 80,
      message: 'Finalizando reserva...'
    });
  }

  setComplete(): void {
    this.updateState({
      isLoading: false,
      step: 'complete',
      progress: 100,
      message: '¡Reserva confirmada!',
      canRetry: false
    });
  }

  setError(message: string, canRetry: boolean = true): void {
    this.updateState({
      isLoading: false,
      step: 'error',
      progress: 0,
      message,
      canRetry
    });
  }
}
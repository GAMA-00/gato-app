import { generateRecurringInstances, RecurringRule, RecurringInstance } from '@/utils/recurringInstanceGenerator';

export { generateRecurringInstances, type RecurringRule, type RecurringInstance };

// Hook para obtener reglas recurrentes activas
export const useRecurringRules = (providerId?: string) => {
  // Este hook se puede implementar más tarde si es necesario
  return {
    data: [],
    isLoading: false,
    error: null
  };
};

// Hook para generar instancias automáticamente
export const useAutoGenerateInstances = () => {
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};

// Hook para generar instancias recurrentes
export const useGenerateRecurringInstances = () => {
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};
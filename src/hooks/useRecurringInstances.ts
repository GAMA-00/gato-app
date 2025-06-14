
// Este archivo ya no es necesario ya que las tablas de recurring_instances fueron eliminadas
// Mantener como archivo stub para evitar errores de importación

export const useRecurringInstances = () => {
  console.log('useRecurringInstances: Sistema de recurrencia complejo eliminado');
  return {
    data: [],
    isLoading: false,
    error: null
  };
};

export const useAutoGenerateInstances = () => {
  console.log('useAutoGenerateInstances: Sistema de recurrencia complejo eliminado');
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};

export const useGenerateRecurringInstances = () => {
  console.log('useGenerateRecurringInstances: Sistema de recurrencia complejo eliminado');
  return {
    mutate: () => Promise.resolve(0),
    isLoading: false
  };
};

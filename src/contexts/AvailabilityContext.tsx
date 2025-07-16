import React, { createContext, useContext, useCallback, useRef } from 'react';

interface AvailabilityContextType {
  notifyAvailabilityChange: (providerId: string) => void;
  subscribeToAvailabilityChanges: (providerId: string, callback: () => void) => () => void;
}

const AvailabilityContext = createContext<AvailabilityContextType | undefined>(undefined);

export const useAvailabilityContext = () => {
  const context = useContext(AvailabilityContext);
  if (!context) {
    throw new Error('useAvailabilityContext must be used within AvailabilityProvider');
  }
  return context;
};

export const AvailabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listenersRef = useRef<Record<string, (() => void)[]>>({});

  const notifyAvailabilityChange = useCallback((providerId: string) => {
    console.log('Notificando cambio de disponibilidad para proveedor:', providerId);
    const listeners = listenersRef.current[providerId] || [];
    listeners.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error executing availability change callback:', error);
      }
    });
  }, []);

  const subscribeToAvailabilityChanges = useCallback((providerId: string, callback: () => void) => {
    console.log('Suscribiendo hook a cambios de disponibilidad para proveedor:', providerId);
    
    if (!listenersRef.current[providerId]) {
      listenersRef.current[providerId] = [];
    }
    listenersRef.current[providerId].push(callback);

    // Return unsubscribe function
    return () => {
      if (listenersRef.current[providerId]) {
        listenersRef.current[providerId] = listenersRef.current[providerId].filter(cb => cb !== callback);
      }
    };
  }, []);

  return (
    <AvailabilityContext.Provider value={{
      notifyAvailabilityChange,
      subscribeToAvailabilityChanges
    }}>
      {children}
    </AvailabilityContext.Provider>
  );
};
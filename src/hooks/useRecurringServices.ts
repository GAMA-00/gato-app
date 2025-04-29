
import { useState, useEffect } from 'react';
import { Service } from '@/lib/types';

export function useRecurringServices() {
  const [count, setCount] = useState(0);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const savedServices = localStorage.getItem('gato_services');
    
    if (savedServices) {
      try {
        const parsedServices = JSON.parse(savedServices);
        const recurringServicesCount = parsedServices.filter(
          (service: Service) => service.category === 'home'
        ).length;
        
        setCount(recurringServicesCount);
        setServices(parsedServices);
      } catch (err) {
        console.error('Error parsing services:', err);
      }
    }
  }, []);

  return { count, services };
}

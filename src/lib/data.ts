
import { Home, Scissors, PawPrint, Dumbbell, Book, Globe, Car, Sprout, Sparkles, Wrench } from 'lucide-react';

export const RESIDENCIAS = [
  {
    id: '1',
    name: 'Residencia A',
    address: 'Calle 1, #1-1',
  },
  {
    id: '2',
    name: 'Residencia B',
    address: 'Calle 2, #2-2',
  },
  {
    id: '3',
    name: 'Residencia C',
    address: 'Calle 3, #3-3',
  },
];

// Define color and icon properties for service categories
export const SERVICE_CATEGORIES = {
  'home': { 
    label: 'Hogar', 
    color: '#4f46e5', 
    bgColor: '#eef2ff',
    icon: Home
  },
  'personal-care': { 
    label: 'Cuidado Personal', 
    color: '#ec4899', 
    bgColor: '#fce7f3',
    icon: Scissors
  },
  'pets': { 
    label: 'Mascotas', 
    color: '#f59e0b', 
    bgColor: '#fef3c7',
    icon: PawPrint
  },
  'sports': { 
    label: 'Deportes', 
    color: '#10b981', 
    bgColor: '#d1fae5',
    icon: Dumbbell
  },
  'classes': { 
    label: 'Clases', 
    color: '#3b82f6', 
    bgColor: '#dbeafe',
    icon: Book
  },
  'car-wash': { 
    label: 'Lavado de Autos', 
    color: '#8b5cf6', 
    bgColor: '#ede9fe',
    icon: Car
  },
  'gardening': { 
    label: 'Jardinería', 
    color: '#059669', 
    bgColor: '#d1fae5',
    icon: Sprout
  },
  'cleaning': { 
    label: 'Limpieza', 
    color: '#0ea5e9', 
    bgColor: '#e0f2fe',
    icon: Sparkles
  },
  'maintenance': { 
    label: 'Mantenimiento', 
    color: '#d97706', 
    bgColor: '#fef3c7',
    icon: Wrench
  },
  'other': { 
    label: 'Otros', 
    color: '#6b7280', 
    bgColor: '#f3f4f6',
    icon: Globe
  }
};

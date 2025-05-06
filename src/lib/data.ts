
import { Home, Scissors, PawPrint, Dumbbell, Book, Globe, Car, Sprout, Sparkles, Wrench } from 'lucide-react';
import { Appointment, Client, Service } from '@/lib/types';

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

// Adding back the mock data exports
export const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Limpieza de hogar',
    description: 'Servicio de limpieza profunda',
    price: 25,
    duration: 60,
    categoryId: 'home'
  },
  {
    id: '2',
    name: 'Corte de cabello',
    description: 'Corte y estilo a domicilio',
    price: 35,
    duration: 45,
    categoryId: 'personal-care'
  },
  {
    id: '3',
    name: 'Paseo de perros',
    description: 'Paseo y cuidado de mascotas',
    price: 20,
    duration: 30,
    categoryId: 'pets'
  }
];

export const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Juan Pérez',
    email: 'juan@example.com',
    phone: '+1234567890',
    address: 'Calle Principal 123',
    notes: 'Cliente preferencial',
    preferredProviders: ['1'],
    isRecurring: true,
    totalBookings: 5,
    createdAt: new Date('2023-01-15')
  },
  {
    id: '2',
    name: 'María García',
    email: 'maria@example.com',
    phone: '+0987654321',
    address: 'Avenida Central 456',
    notes: '',
    preferredProviders: [],
    isRecurring: false,
    totalBookings: 2,
    createdAt: new Date('2023-02-20')
  },
  {
    id: '3',
    name: 'Carlos López',
    email: 'carlos@example.com',
    phone: '+5678901234',
    address: 'Plaza Mayor 789',
    notes: 'Alérgico a productos con perfume',
    preferredProviders: ['2'],
    isRecurring: true,
    totalBookings: 8,
    createdAt: new Date('2022-11-05')
  }
];

export const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    serviceId: '1',
    clientId: '1',
    providerId: '1',
    startTime: new Date(new Date().setHours(10, 0, 0, 0)),
    endTime: new Date(new Date().setHours(11, 0, 0, 0)),
    status: 'confirmed',
    recurrence: 'none',
    notes: '',
    createdAt: new Date('2023-03-01')
  },
  {
    id: '2',
    serviceId: '2',
    clientId: '2',
    providerId: '2',
    startTime: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(14, 0, 0, 0),
    endTime: new Date(new Date().setDate(new Date().getDate() + 1)).setHours(14, 45, 0, 0),
    status: 'scheduled',
    recurrence: 'weekly',
    notes: 'Primera visita',
    createdAt: new Date('2023-03-02')
  },
  {
    id: '3',
    serviceId: '3',
    clientId: '3',
    providerId: '1',
    startTime: new Date(new Date().setDate(new Date().getDate() + 2)).setHours(16, 30, 0, 0),
    endTime: new Date(new Date().setDate(new Date().getDate() + 2)).setHours(17, 0, 0, 0),
    status: 'completed',
    recurrence: 'none',
    notes: 'Mascota grande',
    createdAt: new Date('2023-03-03')
  }
];

export const ACHIEVEMENT_LEVELS = [
  {
    level: 1,
    name: 'Bronce',
    minPoints: 0,
    maxPoints: 499,
    color: '#CD7F32',
    benefits: ['Perfil destacado', 'Acceso a clientes premium'],
  },
  {
    level: 2,
    name: 'Plata',
    minPoints: 500,
    maxPoints: 1999,
    color: '#C0C0C0',
    benefits: ['Comisión reducida 2%', 'Posicionamiento prioritario'],
  },
  {
    level: 3,
    name: 'Oro',
    minPoints: 2000,
    maxPoints: 4999,
    color: '#FFD700',
    benefits: ['Comisión reducida 5%', 'Badge exclusivo', 'Soporte prioritario'],
  },
  {
    level: 4,
    name: 'Platino',
    minPoints: 5000,
    maxPoints: Infinity,
    color: '#E5E4E2',
    benefits: ['Comisión reducida 10%', 'Acceso a eventos exclusivos', 'Programa de referidos'],
  },
];

// Mock function to get provider achievements
export const getProviderAchievements = () => {
  const totalPoints = 2350;
  const currentLevel = 3; // Oro
  const nextLevel = 4;    // Platino
  const pointsToNextLevel = 5000 - totalPoints;
  
  const achievements = [
    {
      id: '1',
      name: 'Primer servicio',
      description: 'Completaste tu primer servicio con éxito',
      points: 50,
      completedAt: new Date('2023-01-15'),
      icon: 'Trophy',
    },
    {
      id: '2',
      name: 'Cliente frecuente',
      description: 'Tienes 5 clientes que te contratan regularmente',
      points: 200,
      completedAt: new Date('2023-03-10'),
      icon: 'Users',
    },
    {
      id: '3',
      name: 'Servicio excelente',
      description: 'Recibiste 10 calificaciones de 5 estrellas',
      points: 300,
      completedAt: new Date('2023-04-20'),
      icon: 'Star',
    },
    {
      id: '4',
      name: 'Siempre a tiempo',
      description: 'Has sido puntual en tus últimos 20 servicios',
      points: 150,
      completedAt: null,
      icon: 'Clock',
    },
    {
      id: '5',
      name: 'Experto verificado',
      description: 'Verifica tus certificaciones profesionales',
      points: 500,
      completedAt: null,
      icon: 'CheckCircle',
    }
  ];
  
  return {
    totalPoints,
    currentLevel,
    nextLevel,
    pointsToNextLevel,
    achievements
  };
};

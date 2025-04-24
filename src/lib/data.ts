import { Service, Client, Appointment, ServiceCategory, AppointmentStatus, Achievement, AchievementLevel, AchievementLevelInfo, ProviderAchievements } from './types';

// Service Categories with colors
export const SERVICE_CATEGORIES: Record<ServiceCategory, { label: string, color: string }> = {
  'home': { label: 'Hogar', color: '#4F46E5' },
  'personal-care': { label: 'Cuidado Personal', color: '#10B981' },
  'pets': { label: 'Mascotas', color: '#3B82F6' },
  'sports': { label: 'Deportes', color: '#16A34A' },
  'classes': { label: 'Clases', color: '#F59E0B' },
  'cleaning': { label: 'Limpieza', color: '#4F46E5' },
  'car-wash': { label: 'Lavado de Autos', color: '#3B82F6' },
  'gardening': { label: 'Jardinería', color: '#16A34A' },
  'maintenance': { label: 'Mantenimiento', color: '#F59E0B' },
  'other': { label: 'Otros', color: '#6B7280' }
};

// Appointment Statuses
export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  { id: 'scheduled', name: 'Scheduled', color: '#3B82F6' },
  { id: 'confirmed', name: 'Confirmed', color: '#10B981' },
  { id: 'completed', name: 'Completed', color: '#8B5CF6' },
  { id: 'cancelled', name: 'Cancelled', color: '#EF4444' },
  { id: 'no-show', name: 'No Show', color: '#F97316' }
];

// Mock Services
export const MOCK_SERVICES: Service[] = [
  {
    id: '1',
    name: 'Standard Home Cleaning',
    subcategoryId: 'cleaning',
    category: 'cleaning',
    duration: 120,
    price: 80,
    description: 'Complete home cleaning service including dusting, vacuuming, and bathroom cleaning.',
    createdAt: new Date('2023-01-15'),
    residenciaIds: ['1', '2', '3'],
    providerId: 'provider-1',
    providerName: 'Clean Experts'
  },
  {
    id: '2',
    name: 'Dog Grooming - Small Breed',
    subcategoryId: 'pets',
    category: 'pets',
    duration: 60,
    price: 50,
    description: 'Full grooming service for small dog breeds including bath, haircut, nail trimming, and ear cleaning.',
    createdAt: new Date('2023-02-10'),
    residenciaIds: ['1', '3'],
    providerId: 'provider-2',
    providerName: 'Pet Paradise'
  },
  {
    id: '3',
    name: 'Premium Car Wash',
    subcategoryId: 'car-wash',
    category: 'car-wash',
    duration: 90,
    price: 45,
    description: 'Exterior wash, wax, and interior vacuuming and detailing.',
    createdAt: new Date('2023-03-05'),
    residenciaIds: ['2'],
    providerId: 'provider-3',
    providerName: 'Shiny Cars'
  },
  {
    id: '4',
    name: 'Lawn Mowing Service',
    subcategoryId: 'gardening',
    category: 'gardening',
    duration: 60,
    price: 35,
    description: 'Professional lawn mowing, edging, and cleanup.',
    createdAt: new Date('2023-04-20'),
    residenciaIds: ['1', '2'],
    providerId: 'provider-4',
    providerName: 'Green Gardens'
  },
  {
    id: '5',
    name: 'Plumbing Maintenance',
    subcategoryId: 'maintenance',
    category: 'maintenance',
    duration: 120,
    price: 95,
    description: 'Routine plumbing check and minor repairs.',
    createdAt: new Date('2023-05-15'),
    residenciaIds: ['3'],
    providerId: 'provider-5',
    providerName: 'Fix-It Plumbing'
  }
];

// Mock Clients
export const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '(555) 123-4567',
    address: '123 Apple St, Cupertino, CA 95014',
    notes: 'Prefers afternoon appointments',
    createdAt: new Date('2023-01-20'),
    isRecurring: true,
    preferredProviders: ['provider-1', 'provider-2'],
    totalBookings: 15
  },
  {
    id: '2',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '(555) 987-6543',
    address: '456 Orange Ave, San Francisco, CA 94107',
    notes: 'Has two dogs that need to be kept in a separate room during cleaning',
    createdAt: new Date('2023-02-15'),
    isRecurring: true,
    preferredProviders: ['provider-3'],
    totalBookings: 8
  },
  {
    id: '3',
    name: 'Emily Johnson',
    email: 'emily.johnson@example.com',
    phone: '(555) 234-5678',
    address: '789 Grape Blvd, Palo Alto, CA 94301',
    notes: 'Allergic to strong cleaning products',
    createdAt: new Date('2023-03-10'),
    isRecurring: false,
    preferredProviders: [],
    totalBookings: 3
  },
  {
    id: '4',
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    phone: '(555) 345-6789',
    address: '321 Pear Lane, San Jose, CA 95110',
    notes: 'Garage code: 1234',
    createdAt: new Date('2023-04-05'),
    isRecurring: false,
    preferredProviders: ['provider-4'],
    totalBookings: 2
  },
  {
    id: '5',
    name: 'Sophie Wilson',
    email: 'sophie.wilson@example.com',
    phone: '(555) 456-7890',
    address: '654 Banana Ct, Mountain View, CA 94043',
    notes: 'Has a home security system - needs advance notice',
    createdAt: new Date('2023-05-20'),
    isRecurring: false,
    preferredProviders: [],
    totalBookings: 1
  }
];

// Helper function to generate dates relative to the current date
const getRelativeDate = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

// Helper function to set time on a date
const setTimeOnDate = (date: Date, hours: number, minutes: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

// Generate mock appointments for the next 30 days
export const generateMockAppointments = (): Appointment[] => {
  const appointments: Appointment[] = [];
  
  // Today's appointments
  const today = new Date();
  appointments.push({
    id: '1',
    serviceId: '1', // Standard Home Cleaning
    clientId: '1', // Jane Smith
    providerId: 'provider-1',
    startTime: setTimeOnDate(today, 10, 0),
    endTime: setTimeOnDate(today, 12, 0),
    status: 'pending', // Changed from 'scheduled'
    recurrence: 'weekly',
    notes: '',
    createdAt: new Date(today.setDate(today.getDate() - 7))
  });
  
  appointments.push({
    id: '2',
    serviceId: '3', // Premium Car Wash
    clientId: '2', // John Doe
    providerId: 'provider-3',
    startTime: setTimeOnDate(today, 14, 0),
    endTime: setTimeOnDate(today, 15, 30),
    status: 'pending', // Changed from 'scheduled'
    recurrence: 'biweekly',
    notes: 'Park in the driveway',
    createdAt: new Date(today.setDate(today.getDate() - 5))
  });
  
  // Tomorrow's appointments
  const tomorrow = getRelativeDate(1);
  appointments.push({
    id: '3',
    serviceId: '2', // Dog Grooming
    clientId: '3', // Emily Johnson
    providerId: 'provider-2',
    startTime: setTimeOnDate(tomorrow, 9, 0),
    endTime: setTimeOnDate(tomorrow, 10, 0),
    status: 'confirmed',
    recurrence: 'monthly',
    notes: 'Dog is a Shih Tzu named Max',
    createdAt: new Date(today.setDate(today.getDate() - 14))
  });
  
  // Day after tomorrow
  const dayAfter = getRelativeDate(2);
  appointments.push({
    id: '4',
    serviceId: '4', // Lawn Mowing
    clientId: '4', // Michael Brown
    providerId: 'provider-4',
    startTime: setTimeOnDate(dayAfter, 16, 0),
    endTime: setTimeOnDate(dayAfter, 17, 0),
    status: 'pending', // Kept as 'pending'
    recurrence: 'biweekly',
    notes: 'Backyard gate code: 5678',
    createdAt: new Date(today.setDate(today.getDate() - 10))
  });
  
  // Next week
  const nextWeek = getRelativeDate(7);
  appointments.push({
    id: '5',
    serviceId: '5', // Plumbing Maintenance
    clientId: '5', // Sophie Wilson
    providerId: 'provider-5',
    startTime: setTimeOnDate(nextWeek, 13, 0),
    endTime: setTimeOnDate(nextWeek, 15, 0),
    status: 'pending',
    recurrence: 'none',
    notes: 'Check kitchen sink and upstairs bathroom',
    createdAt: new Date(today.setDate(today.getDate() - 3))
  });
  
  // Generate more appointments for the coming weeks
  for (let i = 3; i < 30; i += 2) {
    const date = getRelativeDate(i);
    const serviceId = MOCK_SERVICES[Math.floor(Math.random() * MOCK_SERVICES.length)].id;
    const clientId = MOCK_CLIENTS[Math.floor(Math.random() * MOCK_CLIENTS.length)].id;
    const hour = 8 + Math.floor(Math.random() * 9); // Between 8 AM and 5 PM
    
    const service = MOCK_SERVICES.find(s => s.id === serviceId)!;
    const startTime = setTimeOnDate(date, hour, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + service.duration);
    
    appointments.push({
      id: `${i + 5}`,
      serviceId,
      clientId,
      providerId: service.providerId,
      startTime,
      endTime,
      status: 'pending', // Changed from 'scheduled'
      recurrence: Math.random() > 0.5 ? 'none' : 'weekly',
      notes: '',
      createdAt: new Date(date.setDate(date.getDate() - 14))
    });
  }
  
  return appointments;
};

export const MOCK_APPOINTMENTS: Appointment[] = generateMockAppointments();

// Calculate dashboard stats
export const getDashboardStats = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  
  const todayAppointments = MOCK_APPOINTMENTS.filter(
    app => app.startTime.getDate() === today.getDate() && 
           app.startTime.getMonth() === today.getMonth() && 
           app.startTime.getFullYear() === today.getFullYear()
  ).length;
  
  const weekAppointments = MOCK_APPOINTMENTS.filter(
    app => app.startTime >= weekStart && app.startTime < getRelativeDate(7)
  ).length;
  
  const monthRevenue = MOCK_APPOINTMENTS
    .filter(app => app.startTime.getMonth() === today.getMonth())
    .reduce((sum, app) => {
      const service = MOCK_SERVICES.find(s => s.id === app.serviceId);
      return sum + (service ? service.price : 0);
    }, 0);
  
  return {
    todayAppointments,
    weekAppointments,
    monthRevenue,
    activeClients: MOCK_CLIENTS.length,
    pendingOrders: MOCK_APPOINTMENTS.filter(app => app.status === 'pending').length,
    totalProviders: 5,
    recurringClients: MOCK_CLIENTS.filter(client => client.isRecurring).length,
    occasionalClients: MOCK_CLIENTS.filter(client => !client.isRecurring).length
  };
};

// Achievement Levels
export const ACHIEVEMENT_LEVELS: AchievementLevelInfo[] = [
  { 
    level: 'beginner', 
    name: 'Novato', 
    description: '¡Estás empezando! Completa trabajos para ganar puntos y subir de nivel.',
    minPoints: 0, 
    maxPoints: 99, 
    color: '#6B7280', 
    icon: 'user' 
  },
  { 
    level: 'trusty', 
    name: 'Confiable', 
    description: 'Construyendo una reputación de confiabilidad y calidad de servicio.',
    minPoints: 100, 
    maxPoints: 299, 
    color: '#3B82F6', 
    icon: 'shield' 
  },
  { 
    level: 'recommended', 
    name: 'Recomendado', 
    description: 'Altamente valorado por los clientes y activamente recomendado a otros.',
    minPoints: 300, 
    maxPoints: 599, 
    color: '#8B5CF6', 
    icon: 'star' 
  },
  { 
    level: 'expert', 
    name: 'Experto', 
    description: 'Un proveedor de primer nivel conocido por su calidad de servicio excepcional.',
    minPoints: 600, 
    maxPoints: Infinity, 
    color: '#F59E0B', 
    icon: 'award' 
  }
];

// Achievement Types
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    name: 'Primer Servicio Completado',
    description: 'Has completado con éxito tu primer servicio',
    points: 10,
    icon: 'check-circle',
    completedAt: new Date('2023-02-15')
  },
  {
    id: '2',
    name: 'Reseña de Cinco Estrellas',
    description: 'Has recibido una calificación de cinco estrellas de un cliente',
    points: 20,
    icon: 'star',
    completedAt: new Date('2023-03-10')
  },
  {
    id: '3',
    name: 'Compartido en Redes Sociales',
    description: 'Has compartido un trabajo completado en redes sociales',
    points: 15,
    icon: 'share',
    completedAt: new Date('2023-04-05')
  },
  {
    id: '4',
    name: 'Hito de 10 Servicios',
    description: 'Has completado 10 servicios con éxito',
    points: 50,
    icon: 'milestone',
    completedAt: new Date('2023-05-20')
  },
  {
    id: '5',
    name: 'Mes Perfecto',
    description: 'Has completado todos los servicios programados en un mes',
    points: 75,
    icon: 'calendar-check',
    completedAt: new Date('2023-06-30')
  },
  {
    id: '6',
    name: 'Cliente Recurrente',
    description: 'Un cliente ha reservado tus servicios más de una vez',
    points: 25,
    icon: 'repeat',
    completedAt: new Date('2023-07-15')
  },
  {
    id: '7',
    name: 'Respuesta Rápida',
    description: 'Has respondido a todas las consultas de clientes en menos de 1 hora durante una semana',
    points: 30,
    icon: 'zap',
    completedAt: null
  },
  {
    id: '8',
    name: 'Embajador de Servicio',
    description: 'Has referido a otro proveedor de servicios a la plataforma',
    points: 40,
    icon: 'users',
    completedAt: null
  }
];

// Get provider achievements
export const getProviderAchievements = (): ProviderAchievements => {
  const completedAchievements = ACHIEVEMENTS.filter(a => a.completedAt);
  const totalPoints = completedAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
  
  const currentLevelInfo = ACHIEVEMENT_LEVELS.find(
    level => totalPoints >= level.minPoints && totalPoints <= level.maxPoints
  ) || ACHIEVEMENT_LEVELS[0];
  
  const currentLevelIndex = ACHIEVEMENT_LEVELS.findIndex(level => level.level === currentLevelInfo.level);
  const nextLevelInfo = currentLevelIndex < ACHIEVEMENT_LEVELS.length - 1 
    ? ACHIEVEMENT_LEVELS[currentLevelIndex + 1] 
    : null;
  
  const pointsToNextLevel = nextLevelInfo 
    ? nextLevelInfo.minPoints - totalPoints 
    : 0;
  
  return {
    totalPoints,
    currentLevel: currentLevelInfo.level,
    nextLevel: nextLevelInfo?.level || null,
    pointsToNextLevel,
    achievements: ACHIEVEMENTS
  };
};

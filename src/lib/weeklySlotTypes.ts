export interface WeeklySlot {
  id: string;
  date: Date;
  time: string;
  displayTime: string;
  period: 'AM' | 'PM';
  isAvailable: boolean;
  conflictReason?: string;
}

export interface WeeklySlotGroup {
  date: Date;
  dayName: string;
  dayNumber: number;
  dayMonth: string;
  slots: WeeklySlot[];
}

export interface UseWeeklySlotsProps {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  recurrence?: string;
  startDate?: Date;
  daysAhead?: number;
  weekIndex?: number;
}

export interface WeeklySlotStats {
  totalSlots: number;
  availableSlots: number;
  daysWithSlots: number;
  daysWithAvailableSlots: number;
  availabilityRate: number;
}

export interface UseWeeklySlotsReturn {
  slotGroups: WeeklySlotGroup[];
  availableSlotGroups: WeeklySlotGroup[];
  stats: WeeklySlotStats;
  isLoading: boolean;
  isValidatingSlot: boolean;
  lastUpdated: Date | null;
  validateSlot: (slot: WeeklySlot) => Promise<boolean>;
  refreshSlots: () => void;
}
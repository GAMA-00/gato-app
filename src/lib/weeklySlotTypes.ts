export interface WeeklySlot {
  id: string;
  date: Date;
  time: string;
  period: 'AM' | 'PM';
  displayTime: string;
  startTime: Date;
  endTime: Date;
  isAvailable: boolean;
  isManuallyDisabled: boolean;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface WeeklySlotGroup {
  date: Date;
  dayName: string;
  dayNumber: number;
  month: string;
  dayMonth: string;
  slots: WeeklySlot[];
}

export interface WeeklySlotStats {
  totalSlots: number;
  availableSlots: number;
  unavailableSlots: number;
  daysWithSlots: number;
  daysWithAvailableSlots: number;
  averageSlotsPerDay: number;
}

export interface WeeklySlotsFetchParams {
  providerId: string;
  listingId: string;
  serviceDuration: number;
  recurrence: string | null;
  startDate: Date;
  daysAhead?: number;
}

export interface WeeklySlotsFetchResult {
  slots: WeeklySlot[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}
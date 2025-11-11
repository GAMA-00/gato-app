import React, { useState } from 'react';
import RecurrenceSelector from './RecurrenceSelector';
import WeeklySlotGrid from './WeeklySlotGrid';
import NotesSection from './NotesSection';
import CustomVariableSelector from './CustomVariableSelector';
import RecurrencePatternDisplay from './RecurrencePatternDisplay';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { CustomVariableGroup } from '@/lib/types';
import { logger } from '@/utils/logger';

interface NewBookingFormProps {
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  selectedDate: Date | undefined;
  selectedTime: string;
  totalDuration: number;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number, slotIds?: string[]) => void;
  providerId: string;
  listingId: string; // Añadir listingId
  selectedVariants: ServiceVariantWithQuantity[];
  notes: string;
  onNotesChange: (notes: string) => void;
  customVariableGroups?: CustomVariableGroup[];
  customVariableSelections?: any;
  onCustomVariableSelectionsChange?: (selections: any, totalPrice: number) => void;
  slotSize?: number; // Tamaño de slot del servicio
}

const NewBookingForm = ({
  selectedFrequency,
  onFrequencyChange,
  selectedDate,
  selectedTime,
  totalDuration,
  onDateChange,
  onTimeChange,
  onDurationChange,
  providerId,
  listingId, // Añadir listingId
  selectedVariants,
  notes,
  onNotesChange,
  customVariableGroups,
  customVariableSelections,
  onCustomVariableSelectionsChange,
  slotSize = 60 // Default slot size
}: NewBookingFormProps) => {
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);

  // Calculate total service duration from all selected variants
  const totalServiceDuration = selectedVariants.reduce((total, variant) => 
    total + (variant.duration * variant.quantity), 0
  );

  // Calculate required slots based on slot size and total duration
  const requiredSlots = Math.ceil(totalServiceDuration / slotSize);

  logger.debug('NewBookingForm calculations', {
    selectedVariants: selectedVariants.length,
    totalServiceDuration,
    slotSize,
    requiredSlots
  });

  const handleSlotSelect = (slotIds: string[], date: Date, time: string, duration: number) => {
    setSelectedSlotIds(slotIds);
    onDateChange(date);
    onTimeChange(time);
    onDurationChange(duration, slotIds);
  };

  return (
    <div className="space-y-6">
      {/* 1. Recurrence Selection - FIRST, before slot selection */}
      <RecurrenceSelector
        selectedFrequency={selectedFrequency}
        onFrequencyChange={onFrequencyChange}
      />

      {/* 2. Optimized Weekly Slot Grid - Schedule Selection */}
      <WeeklySlotGrid
        providerId={providerId}
        listingId={listingId}
        serviceDuration={selectedVariants[0]?.duration || 60}
        selectedSlots={selectedSlotIds}
        onSlotSelect={handleSlotSelect}
        recurrence={selectedFrequency}
        requiredSlots={requiredSlots}
        slotSize={slotSize}
        totalServiceDuration={totalServiceDuration}
      />

      {/* 3. Recurrence Pattern Display - After schedule selection */}
      {selectedFrequency !== 'once' && selectedDate && selectedTime && (
        <RecurrencePatternDisplay
          frequency={selectedFrequency}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      )}

      {/* 4. Custom Variables */}
      {customVariableGroups && customVariableGroups.length > 0 && onCustomVariableSelectionsChange && (
        <CustomVariableSelector
          customVariableGroups={customVariableGroups}
          onSelectionChange={onCustomVariableSelectionsChange}
          initialSelection={customVariableSelections}
        />
      )}

      {/* 5. Notes */}
      <NotesSection
        notes={notes}
        onNotesChange={onNotesChange}
      />
    </div>
  );
};

export default NewBookingForm;
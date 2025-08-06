import React, { useState } from 'react';
import RecurrenceSelector from './RecurrenceSelector';
import WeeklySlotGrid from './WeeklySlotGrid';
import NotesSection from './NotesSection';
import CustomVariableSelector from './CustomVariableSelector';
import RecurrencePatternDisplay from './RecurrencePatternDisplay';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { CustomVariableGroup } from '@/lib/types';

interface NewBookingFormProps {
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  selectedDate: Date | undefined;
  selectedTime: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  providerId: string;
  listingId: string; // Añadir listingId
  selectedVariants: ServiceVariantWithQuantity[];
  notes: string;
  onNotesChange: (notes: string) => void;
  customVariableGroups?: CustomVariableGroup[];
  customVariableSelections?: any;
  onCustomVariableSelectionsChange?: (selections: any, totalPrice: number) => void;
}

const NewBookingForm = ({
  selectedFrequency,
  onFrequencyChange,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  providerId,
  listingId, // Añadir listingId
  selectedVariants,
  notes,
  onNotesChange,
  customVariableGroups,
  customVariableSelections,
  onCustomVariableSelectionsChange
}: NewBookingFormProps) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const handleSlotSelect = (slotId: string, date: Date, time: string) => {
    setSelectedSlotId(slotId);
    onDateChange(date);
    onTimeChange(time);
  };

  return (
    <div className="space-y-6">
      {/* 1. Recurrence Selection - FIRST, before slot selection */}
      <RecurrenceSelector
        selectedFrequency={selectedFrequency}
        onFrequencyChange={onFrequencyChange}
      />

      {/* 2. Recurrence Pattern Display */}
      {selectedFrequency !== 'once' && selectedDate && selectedTime && (
        <RecurrencePatternDisplay
          frequency={selectedFrequency}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
        />
      )}

      {/* 3. Optimized Weekly Slot Grid */}
      <WeeklySlotGrid
        providerId={providerId}
        listingId={listingId}
        serviceDuration={selectedVariants[0]?.duration || 60}
        selectedSlot={selectedSlotId}
        onSlotSelect={handleSlotSelect}
        recurrence={selectedFrequency}
        requiredSlots={selectedVariants.reduce((sum, variant) => sum + variant.quantity, 0)}
      />

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
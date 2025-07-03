
import React from 'react';
import RecurrenceSelector from './RecurrenceSelector';
import DateTimeSelector from './DateTimeSelector';
import NotesSection from './NotesSection';
import CustomVariableSelector from './CustomVariableSelector';
import { ServiceVariant } from '@/components/client/service/types';
import { CustomVariableGroup } from '@/lib/types';

interface BookingFormProps {
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  selectedDate: Date | undefined;
  selectedTime: string;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  providerId: string;
  selectedVariant: ServiceVariant | undefined;
  notes: string;
  onNotesChange: (notes: string) => void;
  // Nuevas props para variables personalizadas
  customVariableGroups?: CustomVariableGroup[];
  customVariableSelections?: any;
  onCustomVariableSelectionsChange?: (selections: any, totalPrice: number) => void;
}

const BookingForm = ({
  selectedFrequency,
  onFrequencyChange,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  providerId,
  selectedVariant,
  notes,
  onNotesChange,
  customVariableGroups,
  customVariableSelections,
  onCustomVariableSelectionsChange
}: BookingFormProps) => {
  return (
    <div className="space-y-6">
      {/* 1. Recurrence Selection */}
      <RecurrenceSelector
        selectedFrequency={selectedFrequency}
        onFrequencyChange={onFrequencyChange}
      />

      {/* 2. & 3. & 4. Date and Time Selection with Refresh */}
      <DateTimeSelector
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        providerId={providerId}
        serviceDuration={selectedVariant?.duration || 60}
        selectedFrequency={selectedFrequency}
      />

      {/* Variables personalizadas */}
      {customVariableGroups && customVariableGroups.length > 0 && onCustomVariableSelectionsChange && (
        <CustomVariableSelector
          customVariableGroups={customVariableGroups}
          onSelectionChange={onCustomVariableSelectionsChange}
          initialSelection={customVariableSelections}
        />
      )}

      {/* Notes */}
      <NotesSection
        notes={notes}
        onNotesChange={onNotesChange}
      />
    </div>
  );
};

export default BookingForm;

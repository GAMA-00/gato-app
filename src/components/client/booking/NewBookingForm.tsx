import React, { useState } from 'react';
import RecurrenceSelector from './RecurrenceSelector';
import WeeklySlotGrid from './WeeklySlotGrid';
import CustomVariableSelector from './CustomVariableSelector';
import RecurrencePatternDisplay from './RecurrencePatternDisplay';
import { ServiceVariantWithQuantity } from '@/components/client/results/ServiceVariantsSelector';
import { CustomVariableGroup } from '@/lib/types';
import { logger } from '@/utils/logger';

interface NewBookingFormProps {
  currentStep: number;
  selectedFrequency: string;
  onFrequencyChange: (frequency: string) => void;
  selectedDate: Date | undefined;
  selectedTime: string;
  totalDuration: number;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number, slotIds?: string[]) => void;
  providerId: string;
  listingId: string;
  selectedVariants: ServiceVariantWithQuantity[];
  notes: string;
  onNotesChange: (notes: string) => void;
  customVariableGroups?: CustomVariableGroup[];
  customVariableSelections?: any;
  onCustomVariableSelectionsChange?: (selections: any, totalPrice: number) => void;
  slotSize?: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  isRescheduleMode?: boolean;
  onReschedule?: () => void;
  serviceDetails?: any;
  isLoadingReschedule?: boolean;
}

const NewBookingForm = ({
  currentStep,
  selectedFrequency,
  onFrequencyChange,
  selectedDate,
  selectedTime,
  totalDuration,
  onDateChange,
  onTimeChange,
  onDurationChange,
  providerId,
  listingId,
  selectedVariants,
  notes,
  onNotesChange,
  customVariableGroups,
  customVariableSelections,
  onCustomVariableSelectionsChange,
  slotSize = 60,
  onNextStep,
  onPrevStep,
  isRescheduleMode = false,
  onReschedule,
  serviceDetails,
  isLoadingReschedule = false
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
      {/* Step 1: Recurrence Selection */}
      {currentStep === 1 && (
        <div className="pb-24 md:pb-0">
          <RecurrenceSelector
            selectedFrequency={selectedFrequency}
            onFrequencyChange={onFrequencyChange}
          />
          
          {/* Next Button - Show when frequency is selected */}
          {selectedFrequency && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t z-50 md:relative md:bottom-0 md:border-0 md:p-0 md:mt-6">
              <button
                onClick={onNextStep}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl text-sm md:text-base py-3 md:py-3 rounded-lg font-medium"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Time Selection */}
      {currentStep === 2 && (
        <div className="pb-24 md:pb-0">
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

          {/* Recurrence Pattern Display */}
          {selectedFrequency !== 'once' && selectedDate && selectedTime && (
            <RecurrencePatternDisplay
              frequency={selectedFrequency}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
            />
          )}

          {/* Next Button - Show when time is selected */}
          {selectedDate && selectedTime && (
            <div className="fixed bottom-20 left-0 right-0 p-4 bg-background border-t z-50 md:relative md:bottom-0 md:border-0 md:p-0 md:mt-6">
              <button
                onClick={isRescheduleMode ? () => { onReschedule && onReschedule(); } : onNextStep}
                disabled={isRescheduleMode && isLoadingReschedule}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 shadow-lg hover:shadow-xl text-sm md:text-base py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRescheduleMode 
                  ? (isLoadingReschedule ? 'Reagendando...' : 'Reagendar')
                  : 'Siguiente'
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Summary with Notes */}
      {currentStep === 3 && (
        <div className="space-y-2">
          {/* Custom Variables */}
          {customVariableGroups && customVariableGroups.length > 0 && onCustomVariableSelectionsChange && (
            <CustomVariableSelector
              customVariableGroups={customVariableGroups}
              onSelectionChange={onCustomVariableSelectionsChange}
              initialSelection={customVariableSelections}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default NewBookingForm;
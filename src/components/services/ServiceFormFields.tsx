
import React from 'react';
import BasicInfoStep from './steps/BasicInfoStep';
import ProfileStep from './steps/ProfileStep';
import ServiceDetailsStep from './steps/ServiceDetailsStep';
import AvailabilityStep from './steps/AvailabilityStep';
import SlotGeneratorPreview from './steps/SlotGeneratorPreview';

interface ServiceFormFieldsProps {
  currentStep: number;
}

const ServiceFormFields: React.FC<ServiceFormFieldsProps> = ({ currentStep }) => {
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <BasicInfoStep />;
      case 1:
        return <ProfileStep />;
      case 2:
        return <ServiceDetailsStep />;
      case 3:
        return <AvailabilityStep />;
      case 4:
        return <SlotGeneratorPreview />;
      default:
        return null;
    }
  };

  return renderStep();
};

export default ServiceFormFields;

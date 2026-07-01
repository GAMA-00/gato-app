import React from 'react';
import { useFormContext } from 'react-hook-form';
import ServiceVariantEditor from './ServiceVariantEditor';
import PostPaymentToggle from './PostPaymentToggle';
import { v4 as uuidv4 } from 'uuid';

const ServiceDetailsStep: React.FC = () => {
  const { setValue, watch } = useFormContext();
  const isPostPayment = watch('isPostPayment') || false;
  const serviceVariants = watch('serviceVariants') || [
    { id: uuidv4(), name: 'Servicio básico', price: '', duration: 60 }
  ];

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-stone-900">
          3. Detalles del Servicio
        </h2>
        <p className="text-sm sm:text-base text-stone-600 leading-relaxed">
          Define las variantes de tu servicio y sus precios.
        </p>
      </div>

      <PostPaymentToggle />

      <ServiceVariantEditor
        serviceVariants={serviceVariants}
        onVariantsChange={(variants) => setValue('serviceVariants', variants)}
        isPostPayment={isPostPayment}
        currency="CRC"
      />
    </div>
  );
};

export default ServiceDetailsStep;

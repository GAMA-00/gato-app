/**
 * Utility functions for formatting service details in appointments
 */

// Helper function to format price in dollars
export const formatPrice = (price: number | string | null) => {
  if (!price) return '$0';
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  return `$${numericPrice.toLocaleString('en-US')}`;
};

// Helper function to format duration
export const formatDuration = (start: string, end: string) => {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  
  if (durationMinutes >= 60) {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    if (minutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${minutes}m`;
  }
  return `${durationMinutes}m`;
};

// Helper function to get total appointment price (sum of all services)
export const getTotalAppointmentPrice = (appointment: any) => {
  // Priority order: final_price -> sum of custom variables -> sum of selected service variants -> base_price
  if (appointment.final_price !== null && appointment.final_price !== undefined) {
    return appointment.final_price;
  }
  
  // Sum custom variables if they exist
  if (appointment.custom_variables_total_price && appointment.custom_variables_total_price > 0) {
    return appointment.custom_variables_total_price;
  }
  
  // Sum all custom variable selections
  const customVariants = getServiceVariantsWithQuantity(appointment);
  if (customVariants.length > 0) {
    return customVariants.reduce((total, variant) => {
      return total + (variant.price * variant.quantity);
    }, 0);
  }
  
  // Get selected service variant price or fall back to base price
  const selectedVariant = getSelectedServiceVariant(appointment);
  if (selectedVariant) {
    return selectedVariant.price * selectedVariant.quantity;
  }
  
  if (appointment.listings?.base_price !== null && appointment.listings?.base_price !== undefined) {
    return appointment.listings.base_price;
  }
  
  return 0;
};

// Legacy function for backward compatibility
export const getServicePrice = getTotalAppointmentPrice;

// Helper function to get selected service variant
export const getSelectedServiceVariant = (appointment: any) => {
  // Check if there are service variants in the listing
  const listing = appointment.listings;
  if (!listing?.service_variants) return null;

  try {
    const variants = typeof listing.service_variants === 'string' 
      ? JSON.parse(listing.service_variants) 
      : listing.service_variants;

    // For now, since we don't have variant selection info in the appointment,
    // we'll assume the base variant was selected (first one or base_price match)
    const selectedVariant = variants.find((v: any) => 
      parseFloat(v.price) === listing.base_price
    ) || variants[0];

    return selectedVariant ? {
      name: selectedVariant.name,
      price: parseFloat(selectedVariant.price),
      quantity: 1,
      duration: selectedVariant.duration || listing.duration
    } : null;
  } catch (error) {
    console.error('Error parsing service variants:', error);
    return null;
  }
};

// Helper function to get service variants with quantities from custom variables
export const getServiceVariantsWithQuantity = (appointment: any) => {
  const customVariableSelections = appointment.custom_variable_selections;
  if (!customVariableSelections) return [];

  const variants = [];
  
  // Process custom variable selections to extract service variants and quantities
  for (const [groupId, selections] of Object.entries(customVariableSelections)) {
    if (typeof selections === 'object' && selections !== null) {
      for (const [optionId, quantity] of Object.entries(selections)) {
        if (typeof quantity === 'number' && quantity > 0) {
          // Try to find the option name from the listing's custom variable groups
          const listing = appointment.listings;
          if (listing?.custom_variable_groups) {
            const group = listing.custom_variable_groups.find((g: any) => g.id === groupId);
            if (group?.variables) {
              for (const variable of group.variables) {
                const option = variable.options?.find((opt: any) => opt.id === optionId);
                if (option) {
                  variants.push({
                    name: option.name,
                    quantity: quantity,
                    price: option.price || 0,
                    duration: option.duration || listing.duration || 60
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  return variants;
};

// Helper function to get total duration of all services
export const getTotalDuration = (appointment: any) => {
  const customVariants = getServiceVariantsWithQuantity(appointment);
  if (customVariants.length > 0) {
    // Sum duration of all custom variants
    return customVariants.reduce((total, variant) => {
      const variantDuration = variant.duration || appointment.listings?.duration || 60;
      return total + (variantDuration * variant.quantity);
    }, 0);
  }
  
  const selectedVariant = getSelectedServiceVariant(appointment);
  if (selectedVariant) {
    return selectedVariant.duration * selectedVariant.quantity;
  }
  
  // Fallback to appointment duration
  const startTime = new Date(appointment.start_time);
  const endTime = new Date(appointment.end_time);
  return Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
};

// Helper function to get all services breakdown (custom variables + selected variant)
export const getAllServicesBreakdown = (appointment: any) => {
  const services = [];
  
  // Add custom variable services
  const customVariants = getServiceVariantsWithQuantity(appointment);
  customVariants.forEach(variant => {
    services.push(`${variant.name} (${variant.quantity})`);
  });
  
  // Add selected service variant if no custom variables
  if (customVariants.length === 0) {
    const selectedVariant = getSelectedServiceVariant(appointment);
    if (selectedVariant) {
      services.push(`${selectedVariant.name} (${selectedVariant.quantity})`);
    }
  }
  
  return services;
};

// Helper function to format service details for display
export const formatServiceDetails = (appointment: any) => {
  const totalPrice = getTotalAppointmentPrice(appointment);
  const totalDuration = getTotalDuration(appointment);
  const formattedPrice = formatPrice(totalPrice);
  const formattedDuration = totalDuration >= 60 
    ? `${Math.floor(totalDuration / 60)}h${totalDuration % 60 > 0 ? ` ${totalDuration % 60}m` : ''}`
    : `${totalDuration}m`;
  
  const allServices = getAllServicesBreakdown(appointment);
  
  let details = `${formattedPrice} • ${formattedDuration}`;
  
  // Add all services breakdown separated by bullets
  if (allServices.length > 0) {
    details += ` • ${allServices.join(' • ')}`;
  }
  
  return details;
};

// Helper function to get service summary for request cards
export const getServiceSummary = (appointment: any) => {
  const serviceName = appointment.listings?.title || appointment.service_title || 'Servicio';
  const details = formatServiceDetails(appointment);
  
  return {
    serviceName,
    details
  };
};
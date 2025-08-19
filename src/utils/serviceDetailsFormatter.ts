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

// Helper function to get service price from appointment
export const getServicePrice = (appointment: any) => {
  // Priority order: final_price -> custom_variables_total_price -> base_price from listing
  if (appointment.final_price !== null && appointment.final_price !== undefined) {
    return appointment.final_price;
  }
  
  if (appointment.custom_variables_total_price && appointment.custom_variables_total_price > 0) {
    return appointment.custom_variables_total_price;
  }
  
  if (appointment.listings?.base_price !== null && appointment.listings?.base_price !== undefined) {
    return appointment.listings.base_price;
  }
  
  return 0;
};

// Helper function to check if appointment has custom variables
export const hasCustomVariables = (appointment: any) => {
  return appointment.custom_variable_selections && 
         Object.keys(appointment.custom_variable_selections).length > 0;
};

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
      quantity: 1
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
                    price: option.price || 0
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

// Helper function to format service details for display
export const formatServiceDetails = (appointment: any) => {
  const price = getServicePrice(appointment);
  const duration = formatDuration(appointment.start_time, appointment.end_time);
  const formattedPrice = formatPrice(price);
  
  const serviceVariants = getServiceVariantsWithQuantity(appointment);
  const selectedVariant = getSelectedServiceVariant(appointment);
  
  let details = `${formattedPrice} • ${duration}`;
  
  // Add service variant details if available (custom variables)
  if (serviceVariants.length > 0) {
    const variantDetails = serviceVariants
      .map(variant => `${variant.name} (${variant.quantity})`)
      .join(', ');
    details += ` • ${variantDetails}`;
  }
  // Otherwise, add selected service variant (base service type)
  else if (selectedVariant) {
    details += ` • ${selectedVariant.name} (${selectedVariant.quantity})`;
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
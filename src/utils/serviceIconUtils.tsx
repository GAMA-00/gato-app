
import React from 'react';
import * as LucideIcons from 'lucide-react';
import {
  homeServiceImages,
  petsServiceImages,
  classesServiceImages,
  personalCareServiceImages,
  sportsServiceImages,
  otherServiceImages
} from '@/constants/serviceImages';

export interface ServiceIcon {
  type: 'image' | 'icon';
  src?: string;
  component?: React.ComponentType<{ className?: string }>;
}

export const getServiceTypeIcon = (serviceName: string, categoryId: string): ServiceIcon => {
  const normalizedName = serviceName.toLowerCase();
  
  // Check category-specific images
  const categoryImageMaps = {
    'home': homeServiceImages,
    'pets': petsServiceImages,
    'classes': classesServiceImages,
    'personal-care': personalCareServiceImages,
    'sports': sportsServiceImages,
    'other': otherServiceImages,
  };

  const imageMap = categoryImageMaps[categoryId as keyof typeof categoryImageMaps];
  if (imageMap) {
    for (const [key, imagePath] of Object.entries(imageMap)) {
      if (normalizedName.includes(key)) {
        return { type: 'image', src: imagePath };
      }
    }
  }
  
  // Fallback to Lucide icons for services without custom images
  if (normalizedName.includes('limpieza')) {
    return { type: 'icon', component: LucideIcons.Sparkles };
  } else if (normalizedName.includes('planchado')) {
    return { type: 'icon', component: LucideIcons.Shirt };
  } else if (normalizedName.includes('jardin')) {
    return { type: 'icon', component: LucideIcons.Trees };
  } else if (normalizedName.includes('mantenimiento')) {
    return { type: 'icon', component: LucideIcons.Wrench };
  } else if (normalizedName.includes('chef') || normalizedName.includes('cocin')) {
    return { type: 'icon', component: LucideIcons.ChefHat };
  } else if (normalizedName.includes('lavacar') || normalizedName.includes('lava car')) {
    return { type: 'icon', component: LucideIcons.Car };
  }
  
  // Default fallback icon
  return { type: 'icon', component: LucideIcons.Briefcase };
};

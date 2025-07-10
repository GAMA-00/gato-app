import React from 'react';
import { useCategoryPreload } from '@/hooks/useCategoryPreload';

/**
 * Component that handles intelligent preloading for client routes
 * Only preloads category images when on relevant routes
 */
const ClientPreloader: React.FC = () => {
  useCategoryPreload();
  return null;
};

export default ClientPreloader;
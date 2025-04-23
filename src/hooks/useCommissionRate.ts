
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemSettings {
  id: string; // Changed from number to string to match Supabase's response
  commission_rate: number;
  created_at: string;
  updated_at: string;
}

export function useCommissionRate() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();

      if (error) throw error;
      return data as SystemSettings;
    },
  });

  const { mutate: updateCommissionRate } = useMutation({
    mutationFn: async (newRate: number) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ commission_rate: newRate })
        .eq('id', settings?.id || '1'); // Using string '1' as fallback, and using settings?.id which is now a string

      if (error) throw error;
      return newRate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
  });

  return {
    commissionRate: settings?.commission_rate ?? 20,
    isLoading,
    updateCommissionRate,
  };
}

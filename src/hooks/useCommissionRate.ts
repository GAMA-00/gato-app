
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface SystemSettings {
  id: number;
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
        .eq('id', 1);

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

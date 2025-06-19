
import React from 'react';
import { useParams } from 'react-router-dom';
import PageContainer from '@/components/layout/PageContainer';
import ProviderHeader from '@/components/providers/ProviderHeader';
import ProviderInfo from '@/components/providers/ProviderInfo';
import ProviderServices from '@/components/providers/ProviderServices';
import ProviderReviews from '@/components/providers/ProviderReviews';
import ProviderGallery from '@/components/providers/ProviderGallery';
import ProviderAchievements from '@/components/providers/ProviderAchievements';
import ProviderAbout from '@/components/providers/ProviderAbout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const ProviderProfile = () => {
  const { providerId } = useParams();

  const { data: provider, isLoading } = useQuery({
    queryKey: ['provider-profile', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', providerId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!providerId,
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Perfil del Proveedor" subtitle="Cargando...">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </PageContainer>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <Navbar />
        <PageContainer title="Proveedor no encontrado">
          <p>El proveedor que buscas no existe.</p>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer>
        <div className="space-y-8">
          <ProviderHeader provider={provider} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <ProviderAbout provider={provider} />
              <ProviderServices providerId={providerId!} />
              <ProviderReviews providerId={providerId!} />
            </div>
            <div className="space-y-6">
              <ProviderInfo provider={provider} />
              <ProviderAchievements providerId={providerId!} />
              <ProviderGallery providerId={providerId!} />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default ProviderProfile;

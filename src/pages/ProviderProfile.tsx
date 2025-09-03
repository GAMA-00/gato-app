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
import ProviderCertifications from '@/components/providers/ProviderCertifications';
import TeamPhotoSection from '@/components/team/TeamPhotoSection';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';
import { ServiceCategoryGroup } from '@/lib/types';

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

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['provider-services', providerId],
    queryFn: async (): Promise<ServiceCategoryGroup[]> => {
      if (!providerId) return [];
      
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          service_types (
            name,
            service_categories (
              name
            )
          )
        `)
        .eq('provider_id', providerId)
        .eq('is_active', true);
        
      if (error) throw error;
      
      // Group by category
      const grouped = (data || []).reduce((acc: { [key: string]: ServiceCategoryGroup }, listing: any) => {
        const categoryName = listing.service_types?.service_categories?.name || 'Otros';
        if (!acc[categoryName]) {
          acc[categoryName] = {
            id: categoryName,
            name: categoryName,
            services: []
          };
        }
        
        acc[categoryName].services.push({
          id: listing.id,
          name: listing.title,
          options: [{
            id: listing.id,
            size: listing.title,
            price: listing.base_price,
            duration: listing.duration
          }]
        });
        
        return acc;
      }, {});
      
      return Object.values(grouped);
    },
    enabled: !!providerId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Perfil del Proveedor" subtitle="Cargando...">
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-64 w-full rounded-lg" />
            </div>
          </PageContainer>
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="md:ml-52">
          <PageContainer title="Proveedor no encontrado" subtitle="">
            <p>El proveedor que buscas no existe.</p>
          </PageContainer>
        </div>
      </div>
    );
  }

  // Transform provider data to match ProviderProfile interface
  const transformedProvider = {
    id: provider.id,
    name: provider.name || '',
    avatar: provider.avatar_url,
    rating: provider.average_rating || 0,
    ratingCount: 0,
    aboutMe: provider.about_me || '',
    galleryImages: [],
    experienceYears: provider.experience_years || 0,
    hasCertifications: !!provider.certification_files,
    certificationFiles: Array.isArray(provider.certification_files) 
      ? provider.certification_files 
      : provider.certification_files 
        ? [provider.certification_files] 
        : [],
    handlesDangerousDogs: false,
    servicesCompleted: 0,
    isVerified: false,
    joinDate: new Date(provider.created_at),
    detailedRatings: {
      service: 0,
      valueForMoney: 0,
      friendliness: 0,
      materials: 0,
      professionalism: 0,
      punctuality: 0,
    },
    reviews: []
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="md:ml-52">
        <PageContainer title="Perfil del Proveedor" subtitle="">
          <div className="space-y-8">
            <ProviderHeader provider={transformedProvider} />
            
            {/* Servicios disponibles - Primera sección */}
            <ProviderServices 
              categories={categories} 
              isLoading={categoriesLoading}
              onServiceSelect={() => {}}
              showBookingButton={true}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <ProviderAbout provider={transformedProvider} />
                <ProviderReviews provider={transformedProvider} />
              </div>
              <div className="space-y-6">
                <ProviderInfo provider={transformedProvider} />
                <ProviderCertifications provider={transformedProvider} />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Equipo</h3>
                  <TeamPhotoSection providerId={providerId!} />
                </div>
                <ProviderAchievements provider={transformedProvider} />
                <ProviderGallery provider={transformedProvider} />
              </div>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
};

export default ProviderProfile;

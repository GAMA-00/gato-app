
import React from 'react';
import PageContainer from '@/components/layout/PageContainer';
import ServiceCard from '@/components/services/ServiceCard';
import { useListings } from '@/hooks/useListings';
import { Skeleton } from '@/components/ui/skeleton';
import Navbar from '@/components/layout/Navbar';

const Services = () => {
  const { data: listings = [], isLoading } = useListings();

  if (isLoading) {
    return (
      <>
        <Navbar />
        <PageContainer title="Mis Servicios" subtitle="Cargando servicios...">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <PageContainer 
        title="Mis Servicios" 
        subtitle="Gestiona tus servicios y ofertas"
        className="pt-0"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ServiceCard key={listing.id} listing={listing} />
          ))}
        </div>
      </PageContainer>
    </>
  );
};

export default Services;


import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PageContainer from '@/components/layout/PageContainer';
import Navbar from '@/components/layout/Navbar';

const CategoryDetailsLoading = () => {
  return (
    <>
      <Navbar />
      <PageContainer title="Cargando..." subtitle="">
        <div className="space-y-4">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </PageContainer>
    </>
  );
};

export default CategoryDetailsLoading;

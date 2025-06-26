
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import PageContainer from '@/components/layout/PageContainer';
import TeamSection from '@/components/team/TeamSection';

const Team: React.FC = () => {
  const { user, profile } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile?.role !== 'provider') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <Navbar />
      <PageContainer
        title="Equipo"
        subtitle="Gestiona los miembros de tu equipo de trabajo"
      >
        <TeamSection />
      </PageContainer>
    </>
  );
};

export default Team;


import React from 'react';
import { Route } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import Dashboard from '@/pages/Dashboard';
import Services from '@/pages/Services';
import Calendar from '@/pages/Calendar';
import Achievements from '@/pages/Achievements';
import Team from '@/pages/Team';

const ProviderRoutes = () => {
  return (
    <>
      {/* Provider-only routes */}
      <Route
        path="/dashboard"
        element={
          <RoleGuard allowedRole="provider">
            <Dashboard />
          </RoleGuard>
        }
      />
      <Route
        path="/services"
        element={
          <RoleGuard allowedRole="provider">
            <Services />
          </RoleGuard>
        }
      />
      <Route
        path="/calendar"
        element={
          <RoleGuard allowedRole="provider">
            <Calendar />
          </RoleGuard>
        }
      />
      <Route
        path="/achievements"
        element={
          <RoleGuard allowedRole="provider">
            <Achievements />
          </RoleGuard>
        }
      />
      <Route
        path="/team"
        element={
          <RoleGuard allowedRole="provider">
            <Team />
          </RoleGuard>
        }
      />
    </>
  );
};

export default ProviderRoutes;


import React from 'react';
import { Route } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import Dashboard from '@/pages/Dashboard';
import Services from '@/pages/Services';
import Calendar from '@/pages/Calendar';
import Achievements from '@/pages/Achievements';
import Team from '@/pages/Team';

const ProviderRoutes = () => {
  return [
    <Route
      key="dashboard"
      path="/dashboard"
      element={
        <RoleGuard allowedRole="provider">
          <Dashboard />
        </RoleGuard>
      }
    />,
    <Route
      key="services"
      path="/services"
      element={
        <RoleGuard allowedRole="provider">
          <Services />
        </RoleGuard>
      }
    />,
    <Route
      key="calendar"
      path="/calendar"
      element={
        <RoleGuard allowedRole="provider">
          <Calendar />
        </RoleGuard>
      }
    />,
    <Route
      key="achievements"
      path="/achievements"
      element={
        <RoleGuard allowedRole="provider">
          <Achievements />
        </RoleGuard>
      }
    />,
    <Route
      key="team"
      path="/team"
      element={
        <RoleGuard allowedRole="provider">
          <Team />
        </RoleGuard>
      }
    />
  ];
};

export default ProviderRoutes;


import React from 'react';
import { Route } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import Dashboard from '@/pages/Dashboard';
import Services from '@/pages/Services';
import ServiceCreate from '@/pages/ServiceCreate';
import ServiceEdit from '@/pages/ServiceEdit';
import ServiceCatalog from '@/pages/ServiceCatalog';
import Calendar from '@/pages/Calendar';
import Achievements from '@/pages/Achievements';
import OnboardingProvider from '@/pages/OnboardingProvider';
// v1: rutas removidas — Team (equipo es v2), ProviderInvoices y OnvoPayDebug (sin pagos).

const ProviderRoutes = () => {
  return [
    <Route
      key="onboarding"
      path="/onboarding"
      element={
        <RoleGuard allowedRole="provider">
          <OnboardingProvider />
        </RoleGuard>
      }
    />,
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
      key="services-create"
      path="/services/create"
      element={
        <RoleGuard allowedRole="provider">
          <ServiceCreate />
        </RoleGuard>
      }
    />,
    <Route
      key="services-edit"
      path="/services/edit/:id"
      element={
        <RoleGuard allowedRole="provider">
          <ServiceEdit />
        </RoleGuard>
      }
    />,
    <Route
      key="services-catalog"
      path="/services/catalog/:id"
      element={
        <RoleGuard allowedRole="provider">
          <ServiceCatalog />
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
    />
  ];
};

export default ProviderRoutes;

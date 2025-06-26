
import React from 'react';
import { Route } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import ClientBookings from '@/pages/ClientBookings';
import ClientServices from '@/pages/ClientServices';
import ClientCategoryDetails from '@/pages/ClientCategoryDetails';
import ClientResultsView from '@/pages/ClientResultsView';
import ClientProviderServiceDetail from '@/pages/ClientProviderServiceDetail';
import ClientBooking from '@/pages/ClientBooking';
import BookingSummary from '@/pages/BookingSummary';
import Profile from '@/pages/Profile';

const ClientRoutes = () => {
  return (
    <>
      {/* Client-only routes */}
      <Route
        path="/client/categories"
        element={
          <RoleGuard allowedRole="client">
            <ClientServices />
          </RoleGuard>
        }
      />
      <Route
        path="/client/category/:categoryId"
        element={
          <RoleGuard allowedRole="client">
            <ClientCategoryDetails />
          </RoleGuard>
        }
      />
      <Route
        path="/client/results"
        element={
          <RoleGuard allowedRole="client">
            <ClientResultsView />
          </RoleGuard>
        }
      />
      <Route
        path="/client/service/:providerId/:serviceId"
        element={
          <RoleGuard allowedRole="client">
            <ClientProviderServiceDetail />
          </RoleGuard>
        }
      />
      <Route
        path="/client/booking/:serviceId"
        element={
          <RoleGuard allowedRole="client">
            <ClientBooking />
          </RoleGuard>
        }
      />
      <Route
        path="/client/booking-summary"
        element={
          <RoleGuard allowedRole="client">
            <BookingSummary />
          </RoleGuard>
        }
      />
      <Route
        path="/client/bookings"
        element={
          <RoleGuard allowedRole="client">
            <ClientBookings />
          </RoleGuard>
        }
      />
      
      {/* Shared routes - but still role-protected */}
      <Route
        path="/profile"
        element={
          <RoleGuard allowedRole="client">
            <Profile />
          </RoleGuard>
        }
      />
    </>
  );
};

export default ClientRoutes;

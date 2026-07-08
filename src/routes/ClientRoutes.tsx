
import React from 'react';
import { Route } from 'react-router-dom';
import RoleGuard from '@/components/RoleGuard';
import ClientBookings from '@/pages/ClientBookings';
import ClientServices from '@/pages/ClientServices';
import ClientCategoryDetails from '@/pages/ClientCategoryDetails';
import ClientResultsView from '@/pages/ClientResultsView';
import ClientProviderServiceDetail from '@/pages/ClientProviderServiceDetail';
import ClientBooking from '@/pages/ClientBooking';
import { BookingConfirmation } from '@/pages/BookingConfirmation';
// v1: rutas de pagos/facturas removidas (BookingSummary, ClientInvoices, Checkout,
// PaymentStatus, RecurringBookingConfirmation).

const ClientRoutes = () => {
  return [
    <Route
      key="client-categories"
      path="/client/categories"
      element={
        <RoleGuard allowedRole="client">
          <ClientServices />
        </RoleGuard>
      }
    />,
    <Route
      key="client-category-details"
      path="/client/category/:categoryId"
      element={
        <RoleGuard allowedRole="client">
          <ClientCategoryDetails />
        </RoleGuard>
      }
    />,
    <Route
      key="client-results"
      path="/client/results"
      element={
        <RoleGuard allowedRole="client">
          <ClientResultsView />
        </RoleGuard>
      }
    />,
    <Route
      key="client-service-detail"
      path="/client/service/:providerId/:serviceId"
      element={
        <RoleGuard allowedRole="client">
          <ClientProviderServiceDetail />
        </RoleGuard>
      }
    />,
    <Route
      key="client-booking"
      path="/client/booking/:serviceId"
      element={
        <RoleGuard allowedRole="client">
          <ClientBooking />
        </RoleGuard>
      }
    />,
    <Route
      key="client-bookings"
      path="/client/bookings"
      element={
        <RoleGuard allowedRole="client">
          <ClientBookings />
        </RoleGuard>
      }
    />,
    <Route
      key="booking-confirmation"
      path="/booking-confirmation/:appointmentId"
      element={
        <RoleGuard allowedRole="client">
          <BookingConfirmation />
        </RoleGuard>
      }
    />
  ];
};

export default ClientRoutes;

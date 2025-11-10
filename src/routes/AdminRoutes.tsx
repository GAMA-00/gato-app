import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ProtectedAdminRoute } from '@/components/admin/ProtectedAdminRoute';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminAppointments from '@/pages/admin/AdminAppointments';
import AdminClients from '@/pages/admin/AdminClients';
import AdminProviders from '@/pages/admin/AdminProviders';

export const AdminRoutes = () => (
  <ProtectedAdminRoute>
    <AdminLayout>
      <Routes>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="appointments" element={<AdminAppointments />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="providers" element={<AdminProviders />} />
      </Routes>
    </AdminLayout>
  </ProtectedAdminRoute>
);

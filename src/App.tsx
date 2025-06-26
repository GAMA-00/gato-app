
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Achievements from './pages/Achievements';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ClientBookings from './pages/ClientBookings';
import ClientServices from './pages/ClientServices';
import Team from '@/pages/Team';

const queryClient = new QueryClient();

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['client', 'provider']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute allowedRoles={['client', 'provider']}>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services"
                element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <Services />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/achievements"
                element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <Achievements />
                  </ProtectedRoute>
                }
              />

              {/* Client routes */}
              <Route
                path="/client/categories"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientServices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/bookings"
                element={
                  <ProtectedRoute allowedRoles={['client']}>
                    <ClientBookings />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/team"
                element={
                  <ProtectedRoute allowedRoles={['provider']}>
                    <Team />
                  </ProtectedRoute>
                }
              />
              
            </Routes>
          </ErrorBoundary>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

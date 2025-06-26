
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Services from './pages/Services';
import Calendar from './pages/Calendar';
import Achievements from './pages/Achievements';
import Login from './pages/Login';
import ClientLogin from './pages/ClientLogin';
import ProviderLogin from './pages/ProviderLogin';
import Register from './pages/Register';
import ProviderRegister from './pages/ProviderRegister';
import LandingPage from './pages/LandingPage';
import RoleGuard from './components/RoleGuard';
import ErrorBoundary from './components/ErrorBoundary';
import ClientBookings from './pages/ClientBookings';
import ClientServices from './pages/ClientServices';
import Team from '@/pages/Team';
import TestComponent from './components/TestComponent';

const queryClient = new QueryClient();

// Debug component to log route changes
const RouteDebugger = () => {
  const location = useLocation();
  console.log('App - Current route:', location.pathname);
  return null;
};

function App() {
  console.log('App - Component render');
  
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <RouteDebugger />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/test" element={<TestComponent />} />
              
              {/* Separate login pages for each role */}
              <Route path="/client/login" element={<ClientLogin />} />
              <Route path="/provider/login" element={<ProviderLogin />} />
              
              {/* Registration routes */}
              <Route path="/register" element={<Register />} />
              <Route path="/register-provider" element={<ProviderRegister />} />

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
              
            </Routes>
          </ErrorBoundary>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

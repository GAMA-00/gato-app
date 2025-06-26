import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Services from './pages/Services';
import NewService from './pages/NewService';
import EditService from './pages/EditService';
import Bookings from './pages/Bookings';
import Calendar from './pages/Calendar';
import Clients from './pages/Clients';
import Achievements from './pages/Achievements';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ClientCategories from './pages/ClientCategories';
import ClientCategoryDetail from './pages/ClientCategoryDetail';
import ClientServiceDetail from './pages/ClientServiceDetail';
import ClientBooking from './pages/ClientBooking';
import ClientBookings from './pages/ClientBookings';
import { QueryClient } from '@tanstack/react-query';
import Team from '@/pages/Team';

function App() {
  return (
    <Router>
      <AuthProvider>
        <QueryClient>
          <ErrorBoundary>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services"
                element={
                  <ProtectedRoute>
                    <Services />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services/new"
                element={
                  <ProtectedRoute>
                    <NewService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/services/:serviceId/edit"
                element={
                  <ProtectedRoute>
                    <EditService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <Clients />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/achievements"
                element={
                  <ProtectedRoute>
                    <Achievements />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/client/categories"
                element={
                  <ProtectedRoute>
                    <ClientCategories />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/category/:categoryId"
                element={
                  <ProtectedRoute>
                    <ClientCategoryDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/service/:serviceId"
                element={
                  <ProtectedRoute>
                    <ClientServiceDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/booking/:serviceId"
                element={
                  <ProtectedRoute>
                    <ClientBooking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/client/bookings"
                element={
                  <ProtectedRoute>
                    <ClientBookings />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/team"
                element={
                  <ProtectedRoute>
                    <Team />
                  </ProtectedRoute>
                }
              />
              
            </Routes>
          </ErrorBoundary>
        </QueryClient>
      </AuthProvider>
    </Router>
  );
}

export default App;

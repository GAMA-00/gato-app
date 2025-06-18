import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';

// Import pages
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ProviderRegister from '@/pages/ProviderRegister';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import Services from '@/pages/Services';
import Clients from '@/pages/Clients';
import Profile from '@/pages/Profile';
import ProviderProfile from '@/pages/ProviderProfile';
import ClientServices from '@/pages/ClientServices';
import ClientCategoryView from '@/pages/ClientCategoryView';
import ClientCategoryDetails from '@/pages/ClientCategoryDetails';
import ClientProvidersList from '@/pages/ClientProvidersList';
import ClientResultsView from '@/pages/ClientResultsView';
import ClientServiceDetail from '@/pages/ClientServiceDetail';
import ClientBooking from '@/pages/ClientBooking';
import BookingSummary from '@/pages/BookingSummary';
import ClientBookings from '@/pages/ClientBookings';
import Achievements from '@/pages/Achievements';
import PaymentSetup from '@/pages/PaymentSetup';
import NotFound from '@/pages/NotFound';

// Import components
import AuthRoute from '@/components/AuthRoute';
import ProtectedRoute from '@/components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-background">
            <Routes>
              {/* Landing page for unauthenticated users */}
              <Route path="/" element={<AuthRoute><LandingPage /></AuthRoute>} />
              
              {/* Authentication routes */}
              <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
              <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
              <Route path="/register-provider" element={<AuthRoute><ProviderRegister /></AuthRoute>} />
              
              {/* Client routes */}
              <Route path="/client" element={<ProtectedRoute allowedRoles={['client']}><ClientServices /></ProtectedRoute>} />
              <Route path="/client/category/:categoryId" element={<ProtectedRoute allowedRoles={['client']}><ClientCategoryView /></ProtectedRoute>} />
              <Route path="/client/category/:categoryId/details" element={<ProtectedRoute allowedRoles={['client']}><ClientCategoryDetails /></ProtectedRoute>} />
              <Route path="/client/providers" element={<ProtectedRoute allowedRoles={['client']}><ClientProvidersList /></ProtectedRoute>} />
              <Route path="/client/results" element={<ProtectedRoute allowedRoles={['client']}><ClientResultsView /></ProtectedRoute>} />
              <Route path="/client/service/:serviceId" element={<ProtectedRoute allowedRoles={['client']}><ClientServiceDetail /></ProtectedRoute>} />
              <Route path="/client/booking/:serviceId" element={<ProtectedRoute allowedRoles={['client']}><ClientBooking /></ProtectedRoute>} />
              <Route path="/client/booking-summary" element={<ProtectedRoute allowedRoles={['client']}><BookingSummary /></ProtectedRoute>} />
              <Route path="/client/bookings" element={<ProtectedRoute allowedRoles={['client']}><ClientBookings /></ProtectedRoute>} />
              
              {/* Provider routes */}
              <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['provider']}><Dashboard /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute allowedRoles={['provider']}><Calendar /></ProtectedRoute>} />
              <Route path="/services" element={<ProtectedRoute allowedRoles={['provider']}><Services /></ProtectedRoute>} />
              <Route path="/clients" element={<ProtectedRoute allowedRoles={['provider']}><Clients /></ProtectedRoute>} />
              <Route path="/achievements" element={<ProtectedRoute allowedRoles={['provider']}><Achievements /></ProtectedRoute>} />
              
              {/* Shared routes */}
              <Route path="/profile" element={<ProtectedRoute allowedRoles={['client', 'provider']}><Profile /></ProtectedRoute>} />
              <Route path="/provider/:providerId" element={<ProtectedRoute allowedRoles={['client', 'provider']}><ProviderProfile /></ProtectedRoute>} />
              <Route path="/payment-setup" element={<ProtectedRoute allowedRoles={['provider']}><PaymentSetup /></ProtectedRoute>} />
              
              {/* Catch all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/ui/theme-provider';

// Pages
import Index from '@/pages/Index';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Calendar from '@/pages/Calendar';
import Services from '@/pages/Services';
import Clients from '@/pages/Clients';
import Messages from '@/pages/Messages';
import Profile from '@/pages/Profile';
import PaymentSetup from '@/pages/PaymentSetup';
import NotFound from '@/pages/NotFound';
import ClientHome from '@/pages/ClientHome';
import ClientMessages from '@/pages/ClientMessages';
import ClientServices from '@/pages/ClientServices';
import ClientBookingFlow from '@/pages/ClientBookingFlow';
import ClientBookings from '@/pages/ClientBookings';
import ClientCategoryView from '@/pages/ClientCategoryView';
import ClientServiceDetail from '@/pages/ClientServiceDetail';
import ClientBooking from '@/pages/ClientBooking';
import BookingConfirmation from '@/pages/BookingConfirmation';
import BookingSummary from '@/pages/BookingSummary';
import ClientCategoryDetails from '@/pages/ClientCategoryDetails';
import ClientResultsView from '@/pages/ClientResultsView';
import ClientProvidersList from '@/pages/ClientProvidersList';
import ProviderProfile from '@/pages/ProviderProfile';
import ProviderRegister from '@/pages/ProviderRegister';
import Achievements from '@/pages/Achievements';

// Components
import RootLayout from '@/components/layout/RootLayout';
import RequireAuth from '@/components/auth/RequireAuth';

// Context
import { AuthContextProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/AuthContext';

const queryClient = new QueryClient();

function App() {
  const { isLoggedIn, isLoading } = useAuth();
  
  if (isLoading) {
    return <div>Cargando...</div>;
  }
  
  return (
    <div className="min-h-screen">
      <QueryClientProvider client={queryClient}>
        <AuthContextProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<NotFound />} />
              
              {/* Client Routes */}
              <Route path="/client" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientHome /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/messages" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientMessages /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/services" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientServices /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/services/:category" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientCategoryView /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/services/:category/:subcategory" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientCategoryDetails /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/results" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientResultsView /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/providers" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientProvidersList /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/service/:providerId/:serviceId" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientServiceDetail /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/booking/:providerId/:serviceId" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientBooking /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/booking-summary" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><BookingSummary /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/client/bookings" element={
                <RequireAuth roles={['client']}>
                  <RootLayout><ClientBookings /></RootLayout>
                </RequireAuth>
              } />
              
              {/* Provider Routes */}
              <Route path="/provider/register" element={<ProviderRegister />} />
              <Route path="/dashboard" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Dashboard /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/calendar" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Calendar /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/services" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Services /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/clients" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Clients /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/messages" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Messages /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/profile" element={
                <RequireAuth roles={['provider', 'admin', 'client']}>
                  <RootLayout><Profile /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/payment-setup" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><PaymentSetup /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/achievements" element={
                <RequireAuth roles={['provider', 'admin']}>
                  <RootLayout><Achievements /></RootLayout>
                </RequireAuth>
              } />
              <Route path="/provider/:providerId" element={
                
                  <RootLayout><ProviderProfile /></RootLayout>
                
              } />
              
              {/* Add new BookingConfirmation route */}
              <Route path="/client/booking-confirmation" element={
                <RequireAuth>
                  <RootLayout>
                    <BookingConfirmation />
                  </RootLayout>
                </RequireAuth>
              } />
              
            </Routes>
          </BrowserRouter>
        </AuthContextProvider>
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </div>
  );
}

export default App;

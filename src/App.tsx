
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import Achievements from "./pages/Achievements";
import Messages from "./pages/Messages";
import ClientMessages from "./pages/ClientMessages";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentSetup from "./pages/PaymentSetup";
import Profile from "./pages/Profile";
import { ChatProvider } from "./contexts/ChatContext";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import ClientProvidersList from "./pages/ClientProvidersList";
import ProviderRegister from "./pages/ProviderRegister";

// Updated pages - final version
import ClientCategoryView from "./pages/ClientCategoryView";
import ClientCategoryDetails from "./pages/ClientCategoryDetails";
import ClientBookingFlow from "./pages/ClientBookingFlow";
import ClientResultsView from "./pages/ClientResultsView";
import ProviderProfile from "./pages/ProviderProfile";
import BookingSummary from "./pages/BookingSummary";
import ClientServiceDetail from "./pages/ClientServiceDetail";
import ClientServices from "./pages/ClientServices";
import ClientBookings from "./pages/ClientBookings";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Disable auto refetch when window is focused
      retry: 1, // Only try once in case of error
    },
  },
});

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Landing page - Redirect to client category view (final version) */}
        <Route path="/" element={<Navigate to="/client" replace />} />
        
        {/* Auth Routes - These maintain the client context */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-provider" element={<ProviderRegister />} />
        <Route path="/payment-setup" element={<PaymentSetup />} />
        <Route path="/profile" element={
          <RequireAuth>
            <Profile />
          </RequireAuth>
        } />
        
        {/* Provider routes */}
        <Route path="/dashboard" element={
          <RequireAuth providerOnly={true}>
            <Dashboard />
          </RequireAuth>
        } />
        <Route path="/calendar" element={
          <RequireAuth providerOnly={true}>
            <Calendar />
          </RequireAuth>
        } />
        <Route path="/services" element={
          <RequireAuth providerOnly={true}>
            <Services />
          </RequireAuth>
        } />
        <Route path="/messages" element={
          <RequireAuth providerOnly={true} strictAuth={true}>
            <Messages />
          </RequireAuth>
        } />
        <Route path="/achievements" element={
          <RequireAuth providerOnly={true}>
            <Achievements />
          </RequireAuth>
        } />
        
        {/* Client routes - Updated routes of the final version */}
        <Route path="/client" element={<ClientCategoryView />} />
        <Route path="/client/category/:categoryName" element={<ClientCategoryDetails />} />
        <Route path="/client/booking/:categoryName/:serviceId" element={<ClientBookingFlow />} />
        <Route path="/client/results/:categoryName/:serviceId" element={<ClientResultsView />} />
        <Route path="/client/provider/:providerId" element={<ProviderProfile />} />
        {/* Correct route for service details */}
        <Route path="/client/service/:providerId/:serviceId" element={<ClientServiceDetail />} />
        <Route path="/client/booking-summary" element={
          <RequireAuth clientOnly={true} requirePaymentMethod={true}>
            <BookingSummary />
          </RequireAuth>
        } />
        
        {/* Rutas existentes del cliente */}
        <Route path="/client/services/:category/:subcat" element={<ClientProvidersList />} />
        <Route path="/client/services/:buildingId" element={<ClientServices />} />
        <Route path="/client/book/:buildingId/:serviceId" element={
          <RequireAuth clientOnly={true} requirePaymentMethod={true}>
            <ClientBookings />
          </RequireAuth>
        } />
        <Route path="/client/bookings" element={<ClientBookings />} />
        <Route path="/client/messages" element={
          <RequireAuth clientOnly={true} strictAuth={true}>
            <ClientMessages />
          </RequireAuth>
        } />
        
        {/* Not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

// Main component that defines the application structure
const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </ChatProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;

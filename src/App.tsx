
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Services from "./pages/Services";
import Achievements from "./pages/Achievements";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentSetup from "./pages/PaymentSetup";
import Profile from "./pages/Profile";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Updated pages - final version
import ClientCategoryView from "./pages/ClientCategoryView";
import ClientCategoryDetails from "./pages/ClientCategoryDetails";
import ClientResultsView from "./pages/ClientResultsView";
import ProviderProfile from "./pages/ProviderProfile";
import BookingSummary from "./pages/BookingSummary";
import ClientServiceDetail from "./pages/ClientServiceDetail";
import ClientServices from "./pages/ClientServices";
import ClientBookings from "./pages/ClientBookings";
import ClientBooking from "./pages/ClientBooking";
import ProviderRegister from "./pages/ProviderRegister";
import ClientProvidersList from "./pages/ClientProvidersList";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Client Route Component
const ClientRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'provider') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Provider Route Component
const ProviderRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (user?.role === 'client') {
    return <Navigate to="/client" replace />;
  }
  
  return <>{children}</>;
};

// Main App Routes
const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? 
        (user?.role === 'provider' ? <Navigate to="/dashboard" replace /> : <Navigate to="/client" replace />) 
        : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register-provider" element={<ProviderRegister />} />
      
      {/* Root redirect */}
      <Route path="/" element={
        isAuthenticated ? 
          (user?.role === 'provider' ? <Navigate to="/dashboard" replace /> : <Navigate to="/client" replace />) 
          : <Navigate to="/login" replace />
      } />
      
      {/* Protected routes with navbar */}
      <Route path="/profile" element={
        <ProtectedRoute>
          <Navbar />
          <Profile />
        </ProtectedRoute>
      } />
      
      <Route path="/payment-setup" element={
        <ProtectedRoute>
          <Navbar />
          <PaymentSetup />
        </ProtectedRoute>
      } />
      
      {/* Provider routes */}
      <Route path="/dashboard" element={
        <ProviderRoute>
          <Navbar />
          <Dashboard />
        </ProviderRoute>
      } />
      <Route path="/calendar" element={
        <ProviderRoute>
          <Navbar />
          <Calendar />
        </ProviderRoute>
      } />
      <Route path="/services" element={
        <ProviderRoute>
          <Navbar />
          <Services />
        </ProviderRoute>
      } />
      <Route path="/achievements" element={
        <ProviderRoute>
          <Navbar />
          <Achievements />
        </ProviderRoute>
      } />
      
      {/* Client routes */}
      <Route path="/client" element={
        <ClientRoute>
          <Navbar />
          <ClientCategoryView />
        </ClientRoute>
      } />
      <Route path="/client/category/:categoryName" element={
        <ClientRoute>
          <Navbar />
          <ClientCategoryDetails />
        </ClientRoute>
      } />
      <Route path="/client/results/:categoryName/:serviceId" element={
        <ClientRoute>
          <Navbar />
          <ClientResultsView />
        </ClientRoute>
      } />
      <Route path="/client/provider/:providerId" element={
        <ClientRoute>
          <Navbar />
          <ProviderProfile />
        </ClientRoute>
      } />
      <Route path="/client/service/:providerId/:serviceId" element={
        <ClientRoute>
          <Navbar />
          <ClientServiceDetail />
        </ClientRoute>
      } />
      <Route path="/client/booking" element={
        <ClientRoute>
          <Navbar />
          <ClientBooking />
        </ClientRoute>
      } />
      <Route path="/client/booking-summary" element={
        <ClientRoute>
          <Navbar />
          <BookingSummary />
        </ClientRoute>
      } />
      <Route path="/client/bookings" element={
        <ClientRoute>
          <Navbar />
          <ClientBookings />
        </ClientRoute>
      } />
      
      {/* Legacy client routes */}
      <Route path="/client/services/:category/:subcat" element={
        <ClientRoute>
          <Navbar />
          <ClientProvidersList />
        </ClientRoute>
      } />
      <Route path="/client/services/:buildingId" element={
        <ClientRoute>
          <Navbar />
          <ClientServices />
        </ClientRoute>
      } />
      
      {/* Not found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
          <Sonner />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;

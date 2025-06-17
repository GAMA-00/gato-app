
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

// Main App Routes
const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  console.log('=== APP ROUTES RENDER ===');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user:', user?.id, user?.role);
  console.log('isLoading:', isLoading);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={
        isAuthenticated ? 
          <Navigate to={user?.role === 'provider' ? "/dashboard" : "/client"} replace /> 
          : <Login />
      } />
      <Route path="/register" element={<Register />} />
      <Route path="/register-provider" element={<ProviderRegister />} />
      
      {/* Root redirect */}
      <Route path="/" element={
        isAuthenticated ? 
          <Navigate to={user?.role === 'provider' ? "/dashboard" : "/client"} replace /> 
          : <Navigate to="/login" replace />
      } />
      
      {/* Protected routes - all require authentication */}
      {isAuthenticated ? (
        <>
          {/* Shared routes */}
          <Route path="/profile" element={
            <>
              <Navbar />
              <Profile />
            </>
          } />
          
          <Route path="/payment-setup" element={
            <>
              <Navbar />
              <PaymentSetup />
            </>
          } />
          
          {/* Provider routes */}
          {user?.role === 'provider' && (
            <>
              <Route path="/dashboard" element={
                <>
                  <Navbar />
                  <Dashboard />
                </>
              } />
              <Route path="/calendar" element={
                <>
                  <Navbar />
                  <Calendar />
                </>
              } />
              <Route path="/services" element={
                <>
                  <Navbar />
                  <Services />
                </>
              } />
              <Route path="/achievements" element={
                <>
                  <Navbar />
                  <Achievements />
                </>
              } />
            </>
          )}
          
          {/* Client routes */}
          {user?.role === 'client' && (
            <>
              <Route path="/client" element={
                <>
                  <Navbar />
                  <ClientCategoryView />
                </>
              } />
              <Route path="/client/category/:categoryName" element={
                <>
                  <Navbar />
                  <ClientCategoryDetails />
                </>
              } />
              <Route path="/client/results/:categoryName/:serviceId" element={
                <>
                  <Navbar />
                  <ClientResultsView />
                </>
              } />
              <Route path="/client/provider/:providerId" element={
                <>
                  <Navbar />
                  <ProviderProfile />
                </>
              } />
              <Route path="/client/service/:providerId/:serviceId" element={
                <>
                  <Navbar />
                  <ClientServiceDetail />
                </>
              } />
              <Route path="/client/booking" element={
                <>
                  <Navbar />
                  <ClientBooking />
                </>
              } />
              <Route path="/client/booking-summary" element={
                <>
                  <Navbar />
                  <BookingSummary />
                </>
              } />
              <Route path="/client/bookings" element={
                <>
                  <Navbar />
                  <ClientBookings />
                </>
              } />
              <Route path="/client/services/:category/:subcat" element={
                <>
                  <Navbar />
                  <ClientProvidersList />
                </>
              } />
              <Route path="/client/services/:buildingId" element={
                <>
                  <Navbar />
                  <ClientServices />
                </>
              } />
            </>
          )}
          
          {/* Redirect wrong role routes */}
          <Route path="/dashboard" element={
            user?.role === 'client' ? <Navigate to="/client" replace /> : <Navigate to="/dashboard" replace />
          } />
          <Route path="/client" element={
            user?.role === 'provider' ? <Navigate to="/dashboard" replace /> : <Navigate to="/client" replace />
          } />
        </>
      ) : (
        // If not authenticated, redirect all protected routes to login
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
      
      {/* Not found for authenticated users */}
      {isAuthenticated && <Route path="*" element={<NotFound />} />}
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

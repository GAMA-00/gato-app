
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

// Client pages
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppRoutes = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  console.log('AppRoutes render - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated, 'userRole:', user?.role);
  
  // Show loading screen while auth is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show only auth routes
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/register-provider" element={<ProviderRegister />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated routes
  return (
    <>
      <Navbar />
      <Routes>
        {/* Root redirect based on user role */}
        <Route 
          path="/" 
          element={
            <Navigate 
              to={user?.role === 'provider' ? "/dashboard" : "/client"} 
              replace 
            />
          } 
        />
        
        {/* Shared routes */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/payment-setup" element={<PaymentSetup />} />
        
        {/* Provider routes */}
        {user?.role === 'provider' && (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/services" element={<Services />} />
            <Route path="/achievements" element={<Achievements />} />
          </>
        )}
        
        {/* Client routes */}
        {user?.role === 'client' && (
          <>
            <Route path="/client" element={<ClientCategoryView />} />
            <Route path="/client/category/:categoryName" element={<ClientCategoryDetails />} />
            <Route path="/client/results/:categoryName/:serviceId" element={<ClientResultsView />} />
            <Route path="/client/provider/:providerId" element={<ProviderProfile />} />
            <Route path="/client/service/:providerId/:serviceId" element={<ClientServiceDetail />} />
            <Route path="/client/booking" element={<ClientBooking />} />
            <Route path="/client/booking-summary" element={<BookingSummary />} />
            <Route path="/client/bookings" element={<ClientBookings />} />
            <Route path="/client/services/:category/:subcat" element={<ClientProvidersList />} />
            <Route path="/client/services/:buildingId" element={<ClientServices />} />
          </>
        )}
        
        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  console.log('App component rendering...');
  
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

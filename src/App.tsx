
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
import ErrorBoundary from "./components/ErrorBoundary";

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
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      <p className="text-muted-foreground">Cargando...</p>
    </div>
  </div>
);

// Auth Route wrapper - redirects authenticated users
const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (isAuthenticated && user) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client';
    console.log(`User already authenticated, redirecting to ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

// Protected Route wrapper - redirects unauthenticated users  
const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: ('client' | 'provider')[];
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (user && !allowedRoles.includes(user.role)) {
    const redirectTo = user.role === 'provider' ? '/dashboard' : '/client';
    console.log(`User role ${user.role} not allowed for this route, redirecting to ${redirectTo}`);
    return <Navigate to={redirectTo} replace />;
  }
  
  return <>{children}</>;
};

// Root redirect component
const RootRedirect = () => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  const redirectTo = user?.role === 'provider' ? '/dashboard' : '/client';
  return <Navigate to={redirectTo} replace />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  console.log('AppContent render - isAuthenticated:', isAuthenticated);

  return (
    <>
      {isAuthenticated && <Navbar />}
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Auth routes - redirect if already authenticated */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/register-provider" element={<AuthRoute><ProviderRegister /></AuthRoute>} />
        
        {/* Shared protected routes */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute allowedRoles={['client', 'provider']}>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payment-setup" 
          element={
            <ProtectedRoute allowedRoles={['client', 'provider']}>
              <PaymentSetup />
            </ProtectedRoute>
          } 
        />
        
        {/* Provider protected routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['provider']}>
              <Dashboard />
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
          path="/services" 
          element={
            <ProtectedRoute allowedRoles={['provider']}>
              <Services />
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
        
        {/* Client protected routes */}
        <Route 
          path="/client" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientCategoryView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/category/:categoryName" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientCategoryDetails />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/results/:categoryName/:serviceId" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientResultsView />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/provider/:providerId" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ProviderProfile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/service/:providerId/:serviceId" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientServiceDetail />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/booking" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientBooking />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/booking-summary" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <BookingSummary />
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
          path="/client/services/:category/:subcat" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientProvidersList />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/client/services/:buildingId" 
          element={
            <ProtectedRoute allowedRoles={['client']}>
              <ClientServices />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch all - 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  console.log('App component rendering...');
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppContent />
            <Toaster />
            <Sonner />
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;

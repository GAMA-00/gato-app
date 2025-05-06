
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import ClientHome from "./pages/ClientHome";
import ClientServices from "./pages/ClientServices";
import ClientBooking from "./pages/ClientBooking";
import ClientBookings from "./pages/ClientBookings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentSetup from "./pages/PaymentSetup";
import Profile from "./pages/Profile";
import { ChatProvider } from "./contexts/ChatContext";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import ClientProvidersList from "./pages/ClientProvidersList";
import ProviderRegister from "./pages/ProviderRegister";

// Páginas actualizadas - versión final
import ClientCategoryView from "./pages/ClientCategoryView";
import ClientCategoryDetails from "./pages/ClientCategoryDetails";
import ClientBookingFlow from "./pages/ClientBookingFlow";
import ClientResultsView from "./pages/ClientResultsView";
import ProviderProfile from "./pages/ProviderProfile";
import BookingSummary from "./pages/BookingSummary";
import ClientServiceDetail from "./pages/ClientServiceDetail";

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Desactivar refetch automático al enfocar la ventana
      retry: 1, // Solo intentar una vez en caso de error
    },
  },
});

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Landing page - Redirect to client home */}
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
        
        {/* Client routes - Nuevas rutas y actualizaciones */}
        <Route path="/client" element={
          <RequireAuth clientOnly={true}>
            <ClientCategoryView />
          </RequireAuth>
        } />
        <Route path="/client/category/:categoryName" element={
          <RequireAuth clientOnly={true}>
            <ClientCategoryDetails />
          </RequireAuth>
        } />
        <Route path="/client/booking/:categoryName/:serviceId" element={
          <RequireAuth clientOnly={true}>
            <ClientBookingFlow />
          </RequireAuth>
        } />
        <Route path="/client/results/:categoryName/:serviceId" element={
          <RequireAuth clientOnly={true}>
            <ClientResultsView />
          </RequireAuth>
        } />
        <Route path="/client/provider/:providerId" element={
          <RequireAuth clientOnly={true}>
            <ProviderProfile />
          </RequireAuth>
        } />
        {/* Ruta correcta para los detalles del servicio */}
        <Route path="/client/service/:providerId/:serviceId" element={
          <RequireAuth clientOnly={true}>
            <ClientServiceDetail />
          </RequireAuth>
        } />
        <Route path="/client/booking-summary" element={
          <RequireAuth clientOnly={true} requirePaymentMethod={true}>
            <BookingSummary />
          </RequireAuth>
        } />
        
        {/* Rutas existentes del cliente */}
        <Route path="/client/services/:category/:subcat" element={
          <RequireAuth clientOnly={true}>
            <ClientProvidersList />
          </RequireAuth>
        } />
        <Route path="/client/services/:buildingId" element={
          <RequireAuth clientOnly={true}>
            <ClientServices />
          </RequireAuth>
        } />
        <Route path="/client/book/:buildingId/:serviceId" element={
          <RequireAuth clientOnly={true} requirePaymentMethod={true}>
            <ClientBooking />
          </RequireAuth>
        } />
        <Route path="/client/bookings" element={
          <RequireAuth clientOnly={true}>
            <ClientBookings />
          </RequireAuth>
        } />
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

// Corrección de la estructura del App para resolver el problema de TooltipProvider
const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ChatProvider>
            {/* Quitamos TooltipProvider de aquí y lo movemos dentro de los componentes que lo necesitan */}
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

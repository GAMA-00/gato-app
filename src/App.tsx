
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
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PaymentSetup from "./pages/PaymentSetup";
import Profile from "./pages/Profile";
import Landing from "./pages/Landing";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";
import ClientProvidersList from "./pages/ClientProvidersList";
import ProviderRegister from "./pages/ProviderRegister";

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

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Routes>
            {/* Landing page - Entry point */}
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register-provider" element={<ProviderRegister />} />
            <Route path="/payment-setup" element={<PaymentSetup />} />
            
            {/* Protected routes with navbar */}
            <Route path="/profile" element={
              <>
                <Navbar />
                <RequireAuth>
                  <Profile />
                </RequireAuth>
              </>
            } />
            
            {/* Provider routes */}
            <Route path="/dashboard" element={
              <>
                <Navbar />
                <RequireAuth providerOnly={true}>
                  <Dashboard />
                </RequireAuth>
              </>
            } />
            <Route path="/calendar" element={
              <>
                <Navbar />
                <RequireAuth providerOnly={true}>
                  <Calendar />
                </RequireAuth>
              </>
            } />
            <Route path="/services" element={
              <>
                <Navbar />
                <RequireAuth providerOnly={true}>
                  <Services />
                </RequireAuth>
              </>
            } />
            <Route path="/achievements" element={
              <>
                <Navbar />
                <RequireAuth providerOnly={true}>
                  <Achievements />
                </RequireAuth>
              </>
            } />
            
            {/* Client routes */}
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
                <RequireAuth clientOnly={true}>
                  <ClientBooking />
                </RequireAuth>
              </>
            } />
            <Route path="/client/booking-summary" element={
              <>
                <Navbar />
                <RequireAuth clientOnly={true}>
                  <BookingSummary />
                </RequireAuth>
              </>
            } />
            <Route path="/client/bookings" element={
              <>
                <Navbar />
                <ClientBookings />
              </>
            } />
            
            {/* Legacy client routes */}
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
            <Route path="/client/book/:buildingId/:serviceId" element={
              <>
                <Navbar />
                <RequireAuth clientOnly={true} requirePaymentMethod={true}>
                  <ClientBookings />
                </RequireAuth>
              </>
            } />
            
            {/* Not found */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
};

export default App;

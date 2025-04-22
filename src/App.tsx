
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import { ChatProvider } from "./contexts/ChatContext";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/auth/RequireAuth";

// Create a client for React Query
const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Landing page - Redirect to client home */}
        <Route path="/" element={<ClientHome />} />
        
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/payment-setup" element={<PaymentSetup />} />
        
        {/* Provider routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/services" element={<Services />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/achievements" element={<Achievements />} />
        
        {/* Client routes */}
        <Route path="/client" element={<ClientHome />} />
        <Route path="/client/services/:buildingId" element={<ClientServices />} />
        <Route path="/client/book/:buildingId/:serviceId" element={
          <RequireAuth requirePaymentMethod={true}>
            <ClientBooking />
          </RequireAuth>
        } />
        <Route path="/client/bookings" element={
          <RequireAuth>
            <ClientBookings />
          </RequireAuth>
        } />
        <Route path="/client/messages" element={
          <RequireAuth>
            <ClientMessages />
          </RequireAuth>
        } />
        
        {/* Not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ChatProvider>
            <AppRoutes />
            <Toaster />
            <Sonner />
          </ChatProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;

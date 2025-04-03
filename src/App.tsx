
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
import { ChatProvider } from "./contexts/ChatContext";
import Chat from "./components/chat/Chat";

// Create a client for React Query
const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Provider routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/services" element={<Services />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/achievements" element={<Achievements />} />
        
        {/* Client routes */}
        <Route path="/client" element={<ClientHome />} />
        <Route path="/client/services/:buildingId" element={<ClientServices />} />
        <Route path="/client/book/:buildingId/:serviceId" element={<ClientBooking />} />
        <Route path="/client/bookings" element={<ClientBookings />} />
        <Route path="/client/messages" element={<ClientMessages />} />
        
        {/* Not found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Chat />
    </>
  );
};

const App = () => (
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ChatProvider>
          <AppRoutes />
          <Toaster />
          <Sonner />
        </ChatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </BrowserRouter>
);

export default App;

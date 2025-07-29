
import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { AvailabilityProvider } from './contexts/AvailabilityContext';
import { UnifiedAvailabilityProvider } from './contexts/UnifiedAvailabilityContext';
import ErrorBoundary from './components/ErrorBoundary';
import PublicRoutes from './routes/PublicRoutes';
import ProviderRoutes from './routes/ProviderRoutes';
import ClientRoutes from './routes/ClientRoutes';
import ClientPreloader from './components/client/ClientPreloader';
import AvatarTest from './components/debug/AvatarTest';

const queryClient = new QueryClient();

// Debug component to log route changes
const RouteDebugger = () => {
  const location = useLocation();
  console.log('App - Current route:', location.pathname);
  return null;
};

function App() {
  console.log('App - Component render');
  
  return (
    <Router>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AvailabilityProvider>
            <UnifiedAvailabilityProvider>
              <ErrorBoundary>
              <RouteDebugger />
              <ClientPreloader />
              <Routes>
                <Route path="/avatar-test" element={<AvatarTest />} />
                {PublicRoutes()}
                {ProviderRoutes()}
                {ClientRoutes()}
              </Routes>
              </ErrorBoundary>
            </UnifiedAvailabilityProvider>
          </AvailabilityProvider>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;


import React from 'react';
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import PublicRoutes from './routes/PublicRoutes';
import ProviderRoutes from './routes/ProviderRoutes';
import ClientRoutes from './routes/ClientRoutes';

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
          <ErrorBoundary>
            <RouteDebugger />
            <Routes>
              {PublicRoutes()}
              {ProviderRoutes()}
              {ClientRoutes()}
            </Routes>
          </ErrorBoundary>
        </QueryClientProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;

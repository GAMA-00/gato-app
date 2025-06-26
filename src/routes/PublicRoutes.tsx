
import React from 'react';
import { Route } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/Login';
import ClientLogin from '@/pages/ClientLogin';
import ProviderLogin from '@/pages/ProviderLogin';
import Register from '@/pages/Register';
import ProviderRegister from '@/pages/ProviderRegister';
import TestComponent from '@/components/TestComponent';

const PublicRoutes = () => {
  return (
    <>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/test" element={<TestComponent />} />
      
      {/* Separate login pages for each role */}
      <Route path="/client/login" element={<ClientLogin />} />
      <Route path="/provider/login" element={<ProviderLogin />} />
      
      {/* Registration routes */}
      <Route path="/register" element={<Register />} />
      <Route path="/register-provider" element={<ProviderRegister />} />
    </>
  );
};

export default PublicRoutes;

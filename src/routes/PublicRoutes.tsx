
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
  return [
    <Route key="landing" path="/" element={<LandingPage />} />,
    <Route key="login" path="/login" element={<Login />} />,
    <Route key="test" path="/test" element={<TestComponent />} />,
    <Route key="client-login" path="/client/login" element={<ClientLogin />} />,
    <Route key="provider-login" path="/provider/login" element={<ProviderLogin />} />,
    <Route key="register" path="/register" element={<Register />} />,
    <Route key="register-provider" path="/register-provider" element={<ProviderRegister />} />
  ];
};

export default PublicRoutes;

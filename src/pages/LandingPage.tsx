
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Briefcase } from 'lucide-react';
import { logger } from '@/utils/logger';

const LandingPage = () => {
  const navigate = useNavigate();

  logger.debug('Rendering landing page');

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-4 md:space-y-6">
          <div className="w-44 md:w-64">
            <img 
              src="/gato-logo.png?v=3"
              alt="Gato - Servicio a domicilio"
              className="w-full h-auto object-contain"
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-xl md:text-2xl font-medium text-app-text text-center">
            Bienvenido
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          {/* Client Button - Black */}
          <Button 
            onClick={() => {
              logger.debug('Navigating to client login');
              navigate('/client/login');
            }}
            className="w-full h-14 bg-coral text-white hover:bg-coral-light rounded-xl text-base font-medium"
            size="lg"
          >
            <User className="w-5 h-5 mr-3 text-white" />
            Ingresar como Cliente
          </Button>
          
          {/* Provider Button - White with border */}
          <Button 
            onClick={() => {
              logger.debug('Navigating to provider login');
              navigate('/provider/login');
            }}
            variant="outline"
            className="w-full h-14 bg-white text-black border-2 border-gray-200 hover:bg-gray-50 rounded-xl text-base font-medium"
            size="lg"
          >
            <Briefcase className="w-5 h-5 mr-3" />
            Ingresar como Proveedor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

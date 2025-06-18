
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Briefcase } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center space-y-8">
        {/* Logo */}
        <div className="flex flex-col items-center space-y-6">
          <div className="w-24 h-24 md:w-32 md:h-32">
            <img 
              src="/lovable-uploads/4bcbe888-923a-422c-850d-31560fe2e659.png" 
              alt="Gato Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          
          {/* Welcome Text */}
          <h1 className="text-2xl md:text-3xl font-medium text-app-text text-center">
            Bienvenido a Gato
          </h1>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          {/* Client Button - Black */}
          <Button 
            onClick={() => navigate('/login')}
            className="w-full h-14 bg-black text-white hover:bg-gray-800 rounded-xl text-base font-medium"
            size="lg"
          >
            <User className="w-5 h-5 mr-3" />
            Ingresar como Cliente
          </Button>
          
          {/* Provider Button - White with border */}
          <Button 
            onClick={() => navigate('/login')}
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

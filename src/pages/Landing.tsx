
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { User, Briefcase } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const handleClientLogin = () => {
    navigate('/login?role=client');
  };

  const handleProviderLogin = () => {
    navigate('/login?role=provider');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <img 
            src="/lovable-uploads/35c48550-b158-4e96-ad31-0ad71627c42f.png" 
            alt="Gato" 
            className="h-32 w-32 mx-auto object-contain mb-6"
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bienvenido a Gato
          </h1>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={handleClientLogin}
            size="lg"
            className="w-full h-16 text-lg"
          >
            <User className="mr-3 h-6 w-6" />
            Ingresar como Cliente
          </Button>
          
          <Button 
            onClick={handleProviderLogin}
            size="lg"
            variant="outline"
            className="w-full h-16 text-lg"
          >
            <Briefcase className="mr-3 h-6 w-6" />
            Ingresar como Proveedor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Landing;

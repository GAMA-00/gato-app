import React from 'react';

interface ProviderDashboardHeaderProps {
  userName: string;
}

const ProviderDashboardHeader: React.FC<ProviderDashboardHeaderProps> = ({ userName }) => {
  return (
    <div className="space-y-4">
      {/* Logo and Provider label */}
      <div className="flex items-center gap-3">
        <img 
          src="/lovable-uploads/d68195ea-57ea-4225-995d-8857c18be160.png" 
          alt="Gato Logo" 
          className="h-12 w-12 object-contain"
        />
        <span className="text-sm text-muted-foreground font-medium">Proveedor</span>
      </div>
      
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-foreground">
        Bienvenida, {userName}
      </h1>
    </div>
  );
};

export default ProviderDashboardHeader;

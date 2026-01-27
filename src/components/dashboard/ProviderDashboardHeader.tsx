import React from 'react';

interface ProviderDashboardHeaderProps {
  userName: string;
}

const ProviderDashboardHeader: React.FC<ProviderDashboardHeaderProps> = ({ userName }) => {
  return (
    <div>
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-foreground">
        Bienvenida, {userName}
      </h1>
    </div>
  );
};

export default ProviderDashboardHeader;

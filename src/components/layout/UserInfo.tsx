
import React from 'react';

interface UserInfoProps {
  isClientSection: boolean;
}

const UserInfo = ({ isClientSection }: UserInfoProps) => (
  <div className="mt-auto px-4">
    <div className="flex items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
        <span className="text-primary font-medium">JS</span>
      </div>
      <div>
        <p className="font-medium">{isClientSection ? 'Cliente' : 'Proveedor de Servicios'}</p>
        <p className="text-sm text-muted-foreground">{isClientSection ? 'Residente' : 'Panel de Administración'}</p>
      </div>
    </div>
  </div>
);

export default UserInfo;

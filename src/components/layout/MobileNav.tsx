
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackNavigation } from '@/hooks/useBackNavigation';

interface MobileNavProps {
  isClientSection: boolean;
  onSwitchView: () => void;
}

// Barra superior en móvil: solo marca + botón atrás.
// La navegación vive en la barra inferior (MobileBottomNav); por eso ya no hay
// menú hamburguesa en la esquina superior derecha.
const MobileNav = ({ isClientSection }: MobileNavProps) => {
  const { shouldShowBackButton, handleBack } = useBackNavigation();

  return (
    <div className="fixed left-0 top-0 z-50 flex h-12 w-full items-center gap-2 border-b bg-white px-3">
      {shouldShowBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 text-gray-700 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Volver</span>
        </Button>
      )}
      <img src="/gato-logo.png?v=4" alt="Gato" className="h-7 w-auto object-contain" />
      {!isClientSection && (
        <span className="text-sm font-medium text-muted-foreground">Proveedor</span>
      )}
    </div>
  );
};

export default MobileNav;

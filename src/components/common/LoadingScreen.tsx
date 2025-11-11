import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingScreenProps {
  /** Mensaje de carga a mostrar */
  message?: string;
  /** Si true, ocupa toda la pantalla (min-h-screen) */
  fullScreen?: boolean;
  /** Tamaño del spinner */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Clases CSS adicionales para el contenedor */
  className?: string;
  /** Clases CSS adicionales para el texto */
  messageClassName?: string;
}

/**
 * Componente de loading unificado
 * 
 * Reemplaza todos los duplicados de loading states en la aplicación.
 * Proporciona un spinner consistente con mensaje opcional.
 * 
 * @example
 * // Loading de pantalla completa
 * <LoadingScreen message="Cargando..." />
 * 
 * @example
 * // Loading pequeño inline
 * <LoadingScreen size="sm" fullScreen={false} />
 * 
 * @example
 * // Loading personalizado
 * <LoadingScreen 
 *   message="Procesando pago..." 
 *   size="lg"
 *   className="bg-background/80"
 * />
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Cargando...',
  fullScreen = true,
  size = 'md',
  className,
  messageClassName
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const containerClasses = cn(
    'flex flex-col items-center justify-center gap-4',
    fullScreen && 'min-h-screen',
    className
  );

  const messageClasses = cn(
    'text-muted-foreground text-sm',
    messageClassName
  );

  return (
    <div className={containerClasses}>
      <Loader2 
        className={cn(
          'animate-spin text-primary',
          sizeClasses[size]
        )} 
      />
      {message && (
        <p className={messageClasses}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingScreen;

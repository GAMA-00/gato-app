/**
 * SISTEMA DE MODALES DE BOOKING CONSOLIDADO
 * ========================================
 * 
 * Modal base reutilizable para todas las operaciones de booking
 */

import React, { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

// ===== TIPOS BASE =====

export interface BaseModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
}

export interface BaseBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children?: ReactNode;
  actions: BaseModalAction[];
  isLoading?: boolean;
  maxWidth?: string;
  showCloseButton?: boolean;
}

// ===== COMPONENTE BASE =====

export const BaseBookingModal = ({
  isOpen,
  onClose,
  title,
  description,
  icon: Icon,
  iconColor = 'text-primary',
  children,
  actions,
  isLoading = false,
  maxWidth = 'sm:max-w-md',
  showCloseButton = true
}: BaseBookingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={maxWidth}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {Icon && <Icon className={`h-5 w-5 ${iconColor}`} />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {children && (
          <div className="space-y-4 py-4">
            {children}
          </div>
        )}

        <DialogFooter className="gap-2">
          {/* Botones de acción principales */}
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            return (
              <Button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled || isLoading}
                variant={action.variant || 'default'}
                className={action.className}
              >
                {ActionIcon && <ActionIcon className="h-4 w-4 mr-2" />}
                {action.label}
              </Button>
            );
          })}
          
          {/* Botón de cerrar siempre al final */}
          {showCloseButton && (
            <Button 
              variant="ghost" 
              onClick={onClose} 
              disabled={isLoading}
            >
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== HOOKS AUXILIARES =====

/**
 * Hook para manejar el estado de loading de modales
 */
export const useModalLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const withLoading = React.useCallback(async (asyncFn: () => Promise<void>) => {
    setIsLoading(true);
    try {
      await asyncFn();
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, setIsLoading, withLoading };
};

/**
 * Hook para manejar invalidación de queries relacionadas con bookings
 */
export const useBookingQueries = () => {
  const queryClient = useQueryClient();

  const invalidateBookingQueries = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['client-bookings'] });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] });
    queryClient.invalidateQueries({ queryKey: ['unified-calendar-appointments'] });
  }, [queryClient]);

  return { invalidateBookingQueries };
};
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface RescheduleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isRecurring: boolean;
  isLoading: boolean;
}

export const RescheduleConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isRecurring,
  isLoading
}: RescheduleConfirmModalProps) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isRecurring ? '¿Reagendar próxima fecha?' : '¿Reagendar esta cita?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring 
              ? 'El pago se mantendrá en la fecha de la cita original, pero el servicio se recibirá en la nueva fecha.'
              : 'El pago se mantendrá sin cambios; únicamente modificaremos la fecha del servicio.'
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Rechazar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Procesando...
              </>
            ) : (
              'Continuar'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

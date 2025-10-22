import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { usePaymentMethods, PaymentMethod } from '@/hooks/usePaymentMethods';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedCardsSelectorProps {
  selectedCardId: string | null;
  onCardSelect: (cardId: string | null) => void;
  onAddNewCard: () => void;
}

export const SavedCardsSelector: React.FC<SavedCardsSelectorProps> = ({
  selectedCardId,
  onCardSelect,
  onAddNewCard
}) => {
  const { paymentMethods, deletePaymentMethod, isDeleting } = usePaymentMethods();

  const getCardBrand = (cardNumber: string) => {
    const lastFour = cardNumber.slice(-4);
    if (cardNumber.includes('****')) {
      // Para números enmascarados, podríamos intentar detectar por otros medios
      // Por ahora, mostraremos genérico
      return { brand: 'card', color: 'bg-slate-600' };
    }
    // Lógica para detectar marca de tarjeta
    return { brand: 'card', color: 'bg-slate-600' };
  };

  const handleDeleteCard = (cardId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    deletePaymentMethod(cardId);
  };

  if (paymentMethods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No tienes tarjetas guardadas
            </p>
            <Button onClick={onAddNewCard} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Tarjeta
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Selecciona Método de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.map((method) => {
          const { brand, color } = getCardBrand(method.card_number || '');
          const isSelected = selectedCardId === method.id;

          return (
            <div
              key={method.id}
              className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onCardSelect(method.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-6 rounded ${color} flex items-center justify-center`}>
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium">{method.card_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {method.cardholder_name} • Exp: {method.expiry_date}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      Seleccionada
                    </Badge>
                  )}
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar tarjeta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. La tarjeta {method.card_number} será eliminada permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => handleDeleteCard(method.id, e)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          );
        })}

        <Button
          variant="outline"
          onClick={onAddNewCard}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Nueva Tarjeta
        </Button>
      </CardContent>
    </Card>
  );
};
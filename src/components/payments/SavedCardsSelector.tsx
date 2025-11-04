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

  // Filter out cards without onvopay_payment_method_id (legacy cards)
  const validCards = paymentMethods.filter(pm => !!pm.onvopay_payment_method_id);

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

  if (validCards.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="h-5 w-5" />
            Método de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No tienes tarjetas guardadas
            </p>
            <Button onClick={onAddNewCard} className="w-full h-10">
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="h-5 w-5" />
          Selecciona Método de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {validCards.map((method) => {
          const { brand, color } = getCardBrand(method.card_number || '');
          const isSelected = selectedCardId === method.id;

          return (
            <div
              key={method.id}
              className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => onCardSelect(method.id)}
            >
              {/* Badge en esquina superior derecha */}
              {isSelected && (
                <Badge variant="default" className="absolute top-2 right-2 text-xs px-2 py-0">
                  Seleccionada
                </Badge>
              )}
              
              <div className="flex items-start gap-2 pr-24">
                <div className={`w-8 h-5 rounded ${color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <CreditCard className="h-3 w-3 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{method.cardholder_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {method.card_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Exp: {method.expiry_date}
                  </p>
                </div>
              </div>
              
              {/* Botón eliminar en la parte inferior */}
              <div className="absolute bottom-2 right-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-destructive/10"
                      disabled={isDeleting}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
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
          );
        })}

        <Button
          variant="outline"
          onClick={onAddNewCard}
          className="w-full h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Nueva Tarjeta
        </Button>
      </CardContent>
    </Card>
  );
};
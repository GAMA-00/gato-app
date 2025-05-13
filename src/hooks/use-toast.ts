
import * as React from "react";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast as useToastHook } from "@radix-ui/react-toast";

export const ToastContext = React.createContext<{
  toast: (props: {
    title?: string;
    description?: string;
    variant?: "default" | "destructive";
    action?: React.ReactNode;
  }) => void;
  dismiss: (toastId?: string) => void;
}>({
  toast: () => {},
  dismiss: () => {},
});

export function Toaster() {
  const { toasts } = useToastHook();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}

export const useToast = useToastHook;

export const toast = ({
  title,
  description,
  variant,
  action,
}: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  action?: React.ReactNode;
}) => {
  // If we're in the browser
  if (typeof window !== "undefined") {
    const event = new CustomEvent("toast", {
      detail: {
        title,
        description,
        variant,
        action,
      },
    });
    window.dispatchEvent(event);
  }
};

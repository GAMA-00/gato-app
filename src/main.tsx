
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import App from './App.tsx';
import './index.css';

// Limpia cualquier caché de estilos
if (typeof window !== 'undefined') {
  console.log("Initializing app with timestamp:", new Date().toISOString());
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
    <Toaster />
  </TooltipProvider>
);

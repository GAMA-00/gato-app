
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from "@radix-ui/react-tooltip";
import App from './App.tsx';
import './index.css';

// Usar TooltipProvider al nivel más alto de la aplicación
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>
);

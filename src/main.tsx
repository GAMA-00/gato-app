
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from "@/components/ui/tooltip";
import App from './App.tsx';
import './index.css';

// Use TooltipProvider at the highest level of the application
createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>
);

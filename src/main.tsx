
import { createRoot } from 'react-dom/client';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import App from './App.tsx';
import './index.css';

// Register Service Worker for image caching - mejorado
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    .then((registration) => {
      console.log('✅ SW registered successfully: ', registration);
      
      // Activar inmediatamente si hay una actualización pendiente
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    })
    .catch((registrationError) => {
      console.log('❌ SW registration failed: ', registrationError);
    });
  });
}

// Initialize app
if (typeof window !== 'undefined') {
  console.log("Initializing app with timestamp:", new Date().toISOString());
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
    <Toaster />
  </TooltipProvider>
);

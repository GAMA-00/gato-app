
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

// Limpia cualquier caché de estilos y optimiza carga inicial
if (typeof window !== 'undefined') {
  console.log("Initializing app with timestamp:", new Date().toISOString());
  
  // Precargar imágenes críticas inmediatamente
  const criticalImages = [
    '/lovable-uploads/11446302-74b0-4775-bc77-01fbf112f8f0.png',
    '/lovable-uploads/7613f29b-5528-4db5-9357-1d3724a98d5d.png',
    '/lovable-uploads/19672ce3-748b-4ea7-86dc-b281bb9b8d45.png',
    '/lovable-uploads/f5cf3911-b44f-47e9-b52e-4e16ab8b8987.png'
  ];
  
  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
}

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <App />
    <Toaster />
  </TooltipProvider>
);
